-- BookMyDesk core schema: tables, row level security, sign-up triggers and the booking functions.
-- Clients never write to bookings or seat_releases directly; every change goes through a
-- security definer function that validates the rules and raises a short error code the UI translates.

-- Types -------------------------------------------------------------------------------------------

create type public.slot as enum ('AM', 'PM');
create type public.booking_status as enum ('booked', 'checked_in', 'released', 'cancelled');
create type public.user_role as enum ('user', 'admin');

-- Settings (single row) ---------------------------------------------------------------------------

create table public.settings (
  id boolean primary key default true check (id),
  allowed_email_domains text[] not null default '{cetin.cz}',
  timezone text not null default 'Europe/Prague',
  booking_window_days integer not null default 7 check (booking_window_days between 0 and 60),
  am_start time not null default '06:00',
  pm_start time not null default '13:00',
  am_checkin_deadline time not null default '10:00',
  pm_checkin_deadline time not null default '14:00',
  owner_checkin_exempt boolean not null default true,
  max_days_per_week integer check (max_days_per_week between 1 and 7),
  booking_retention_days integer not null default 90 check (booking_retention_days >= 7),
  updated_at timestamptz not null default now()
);
comment on table public.settings is 'Single row of app rules. Edit in the dashboard; an empty allowed_email_domains allows every domain.';
insert into public.settings default values;

-- Places and seats --------------------------------------------------------------------------------

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index floors_office_id_idx on public.floors (office_id);

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  code text not null unique,
  zone text,
  owner_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index seats_floor_id_idx on public.seats (floor_id);
create index seats_owner_id_idx on public.seats (owner_id);
comment on column public.seats.owner_id is 'Set for semi-fixed seats: only the owner may book it unless a seat_releases row exists for that date and slot.';

-- Profiles ----------------------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 80),
  email text not null unique,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- Bookings and releases ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid not null references public.seats(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  slot public.slot not null,
  status public.booking_status not null default 'booked',
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_one_per_seat_slot on public.bookings (seat_id, date, slot)
  where status in ('booked', 'checked_in');
create unique index bookings_one_per_user_slot on public.bookings (user_id, date, slot)
  where status in ('booked', 'checked_in');
create index bookings_active_by_date_idx on public.bookings (date, slot) where status in ('booked', 'checked_in');
create index bookings_user_date_idx on public.bookings (user_id, date);

create table public.seat_releases (
  id uuid primary key default gen_random_uuid(),
  seat_id uuid not null references public.seats(id) on delete cascade,
  date date not null,
  slot public.slot not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (seat_id, date, slot)
);

-- Helpers -----------------------------------------------------------------------------------------

-- Single source of "now" so pgTAP tests can freeze time by replacing this function.
create function public.bmd_now() returns timestamptz
language sql stable as $$ select now() $$;

create function public.bmd_today() returns date
language sql stable security definer set search_path = '' as $$
  select (public.bmd_now() at time zone s.timezone)::date from public.settings s limit 1
$$;

create function public.display_name_from_email(p_email text) returns text
language sql immutable as $$
  select initcap(regexp_replace(split_part(p_email, '@', 1), '[._-]+', ' ', 'g'))
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.user_id = auth.uid()), false)
$$;

create function public.ping() returns text
language sql stable as $$ select 'pong' $$;

create function public.get_allowed_email_domains() returns text[]
language sql stable security definer set search_path = '' as $$
  select s.allowed_email_domains from public.settings s limit 1
$$;

-- Sign-up triggers --------------------------------------------------------------------------------

create function public.enforce_email_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_allowed text[];
  v_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
begin
  select array(select lower(d) from unnest(s.allowed_email_domains) d) into v_allowed from public.settings s limit 1;
  if coalesce(array_length(v_allowed, 1), 0) > 0 and not (v_domain = any (v_allowed)) then
    raise exception 'email_domain_not_allowed' using hint = 'Allowed domains: ' || array_to_string(v_allowed, ', ');
  end if;
  return new;
end $$;

create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.enforce_email_domain();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), public.display_name_from_email(new.email)),
    lower(new.email)
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin -------------------------------------------------------------------------------------------

create function public.admin_set_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_role not in ('user', 'admin') then raise exception 'invalid_role'; end if;
  update public.profiles set role = p_role::public.user_role where user_id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
end $$;

-- Booking functions -------------------------------------------------------------------------------

create function public.book_seat(p_seat_id uuid, p_date date, p_slot text)
returns setof public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_seat public.seats;
  v_slots public.slot[];
  v_slot public.slot;
  v_booking public.bookings;
  v_constraint text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  v_slots := case upper(p_slot)
    when 'AM' then array['AM'::public.slot]
    when 'PM' then array['PM'::public.slot]
    when 'FULL' then array['AM'::public.slot, 'PM'::public.slot]
    else null
  end;
  if v_slots is null then raise exception 'invalid_slot'; end if;

  select * into v_seat from public.seats s where s.id = p_seat_id;
  if not found then raise exception 'seat_not_found'; end if;
  if not v_seat.active then raise exception 'seat_inactive'; end if;

  foreach v_slot in array v_slots loop
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
      insert into public.bookings (seat_id, user_id, date, slot)
      values (p_seat_id, v_user, p_date, v_slot)
      returning * into v_booking;
    exception when unique_violation then
      -- Lost a race with a concurrent request; the partial unique indexes are the final arbiter.
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_one_per_user_slot' then raise exception 'user_already_booked'; end if;
      raise exception 'seat_taken';
    end;
    return next v_booking;
  end loop;
  return;
end $$;

create function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.user_id <> v_user then raise exception 'not_your_booking'; end if;
  if v_booking.status = 'checked_in' then raise exception 'cannot_cancel'; end if;
  if v_booking.status <> 'booked' then raise exception 'booking_not_active'; end if;

  update public.bookings
  set status = 'cancelled', updated_at = public.bmd_now()
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end $$;

-- Privileges --------------------------------------------------------------------------------------

-- Tables: anon gets nothing; authenticated reads, and writes only where a policy allows it.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.settings, public.offices, public.floors, public.seats, public.bookings, public.seat_releases
  to authenticated;
grant insert, update, delete on public.offices, public.floors, public.seats to authenticated; -- admins only, via RLS
grant select (user_id, display_name), update (display_name) on public.profiles to authenticated;

-- Functions: Postgres grants execute to PUBLIC by default, so lock each one down explicitly.
revoke all on function public.bmd_now() from public, anon, authenticated;
revoke all on function public.bmd_today() from public, anon, authenticated;
revoke all on function public.display_name_from_email(text) from public, anon, authenticated;
revoke all on function public.enforce_email_domain() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.book_seat(uuid, date, text) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.is_admin(), public.admin_set_role(uuid, text),
  public.book_seat(uuid, date, text), public.cancel_booking(uuid) to authenticated;

revoke all on function public.ping() from public;
revoke all on function public.get_allowed_email_domains() from public;
grant execute on function public.ping(), public.get_allowed_email_domains() to anon, authenticated;

-- Row level security ------------------------------------------------------------------------------

alter table public.settings enable row level security;
alter table public.offices enable row level security;
alter table public.floors enable row level security;
alter table public.seats enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.seat_releases enable row level security;

create policy "settings: read" on public.settings for select to authenticated using (true);

create policy "offices: read" on public.offices for select to authenticated using (true);
create policy "offices: admins manage" on public.offices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "floors: read" on public.floors for select to authenticated using (true);
create policy "floors: admins manage" on public.floors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "seats: read" on public.seats for select to authenticated using (true);
create policy "seats: admins manage" on public.seats for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "profiles: read names" on public.profiles for select to authenticated using (true);
create policy "profiles: rename self" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "bookings: read" on public.bookings for select to authenticated using (true);
create policy "seat_releases: read" on public.seat_releases for select to authenticated using (true);

-- Realtime ----------------------------------------------------------------------------------------

alter publication supabase_realtime add table public.bookings, public.seat_releases, public.seats;
