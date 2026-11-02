-- Seat owners can be assigned by email before they ever sign in, and a directory of colleagues
-- gives new accounts a proper display name (CETIN also issues ID-style addresses like ma077535@).

alter table public.seats
  add column owner_emails text[] not null default '{}',
  add column owner_name text;
comment on column public.seats.owner_emails is
  'Any address of the seat owner. The seat is held for them from day one and owner_id is linked when they sign in. To remove an owner clear both owner_emails and owner_id.';
comment on column public.seats.owner_name is 'Shown as "Held by …" until the owner has signed in.';

create table public.directory (
  email text primary key,
  display_name text not null check (length(display_name) between 1 and 80),
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);
comment on table public.directory is
  'Known colleagues. display_name and role are applied when that email signs in for the first time. Managed in the dashboard.';
alter table public.directory enable row level security;
revoke all on public.directory from anon, authenticated;

create function public.normalize_directory_email() returns trigger
language plpgsql as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end $$;
create trigger directory_normalize_email
  before insert or update on public.directory
  for each row execute function public.normalize_directory_email();

-- Assigning owner_emails links owner_id right away when that person already has an account.
create function public.link_seat_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.owner_emails := array(select lower(btrim(e)) from unnest(new.owner_emails) e where btrim(e) <> '');
  if new.owner_id is null and cardinality(new.owner_emails) > 0 then
    select p.user_id into new.owner_id
    from public.profiles p
    where p.email = any (new.owner_emails)
    order by p.created_at
    limit 1;
  end if;
  return new;
end $$;
create trigger seats_link_owner
  before insert or update of owner_emails on public.seats
  for each row execute function public.link_seat_owner();

-- Sign-in: name from the directory or the seat assignment, and link any seat waiting for this address.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
  v_name text;
  v_role public.user_role;
begin
  select d.display_name, d.role into v_name, v_role from public.directory d where d.email = v_email;
  if v_name is null then
    select s.owner_name into v_name from public.seats s
    where v_email = any (s.owner_emails) and s.owner_name is not null
    limit 1;
  end if;

  insert into public.profiles (user_id, display_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_name, public.display_name_from_email(new.email)),
    v_email,
    coalesce(v_role, 'user')
  )
  on conflict (user_id) do nothing;

  update public.seats s set owner_id = new.id
  where s.owner_id is null and v_email = any (s.owner_emails);
  return new;
end $$;

-- book_seat: a seat assigned by email is held even while owner_id is still null.
create or replace function public.book_seat(p_seat_id uuid, p_date date, p_slot text)
returns setof public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_now timestamp;
  v_today date;
  v_seat public.seats;
  v_slots public.slot[];
  v_slot public.slot;
  v_status public.booking_status;
  v_checked_in_at timestamptz;
  v_days_this_week integer;
  v_booking public.bookings;
  v_constraint text;
  v_held boolean;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  v_slots := public.bmd_parse_slots(p_slot);

  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;
  v_today := v_now::date;
  perform public.bmd_assert_window(p_date, v_settings, v_today);

  select * into v_seat from public.seats s where s.id = p_seat_id;
  if not found then raise exception 'seat_not_found'; end if;
  if not v_seat.active then raise exception 'seat_inactive'; end if;

  v_held := (v_seat.owner_id is not null and v_seat.owner_id <> v_user)
         or (v_seat.owner_id is null and cardinality(v_seat.owner_emails) > 0);

  if v_settings.max_days_per_week is not null then
    select count(distinct b.date) into v_days_this_week
    from public.bookings b
    where b.user_id = v_user and b.status in ('booked', 'checked_in')
      and date_trunc('week', b.date::timestamp) = date_trunc('week', p_date::timestamp)
      and b.date <> p_date;
    if v_days_this_week >= v_settings.max_days_per_week then raise exception 'weekly_limit'; end if;
  end if;

  foreach v_slot in array v_slots loop
    v_status := 'booked';
    v_checked_in_at := null;

    if p_date = v_today then
      if v_now::time >= (case v_slot when 'AM' then v_settings.pm_start else '24:00'::time end) then
        raise exception 'slot_ended';
      end if;
      if v_now::time > (case v_slot when 'AM' then v_settings.am_checkin_deadline else v_settings.pm_checkin_deadline end) then
        v_status := 'checked_in';
        v_checked_in_at := public.bmd_now();
      end if;
    end if;

    if v_held and not exists (select 1 from public.seat_releases r
                              where r.seat_id = p_seat_id and r.date = p_date and r.slot = v_slot) then
      raise exception 'seat_held';
    end if;

    if exists (select 1 from public.bookings b
               where b.seat_id = p_seat_id and b.date = p_date and b.slot = v_slot
                 and b.status in ('booked', 'checked_in')) then
      raise exception 'seat_taken';
    end if;
    if exists (select 1 from public.bookings b
               where b.user_id = v_user and b.date = p_date and b.slot = v_slot
                 and b.status in ('booked', 'checked_in')) then
      raise exception 'user_already_booked';
    end if;

    begin
      insert into public.bookings (seat_id, user_id, date, slot, status, checked_in_at)
      values (p_seat_id, v_user, p_date, v_slot, v_status, v_checked_in_at)
      returning * into v_booking;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_one_per_user_slot' then raise exception 'user_already_booked'; end if;
      raise exception 'seat_taken';
    end;
    return next v_booking;
  end loop;
  return;
end $$;

revoke all on function public.normalize_directory_email() from public, anon, authenticated;
revoke all on function public.link_seat_owner() from public, anon, authenticated;
