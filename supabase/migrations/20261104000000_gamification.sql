-- Gamification: office-day streaks, badges and the team-day threshold.
-- Counters live in user_stats and badges in achievements so they outlive the booking purge.
-- Everything here is private to the person: colleagues cannot read anyone's stats or badges.

alter table public.settings
  add column team_day_threshold integer not null default 8 check (team_day_threshold > 0);
comment on column public.settings.team_day_threshold is
  'Distinct people booked on one day for it to count as a team day (day strip marker, nudges, the team_day badge).';

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  office_days integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_office_day date,
  seats_used uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
comment on table public.user_stats is
  'Per-person counters kept beyond booking retention: checked-in office days, streak of consecutive ISO weeks with at least one office day, seats sat in.';

create table public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null check (badge in (
    'first_day', 'early_bird', 'regular', 'resident', 'explorer', 'full_house', 'team_day', 'on_a_roll', 'reliable')),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
comment on table public.achievements is 'Badges earned at check-in; awarded only by bmd_record_checkin().';

-- Privileges and row level security ---------------------------------------------------------------

revoke all on public.user_stats, public.achievements from anon, authenticated;
grant select on public.user_stats, public.achievements to authenticated;

alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;
create policy "user_stats: own" on public.user_stats for select to authenticated using (user_id = auth.uid());
create policy "achievements: own" on public.achievements for select to authenticated using (user_id = auth.uid());

-- Recording a check-in ----------------------------------------------------------------------------

-- Returns the badge as a one-element array when it is new, so callers can collect what was just earned.
create function public.bmd_award(p_user uuid, p_badge text) returns text[]
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.achievements (user_id, badge) values (p_user, p_badge) on conflict do nothing;
  if found then return array[p_badge]; end if;
  return '{}';
end $$;

-- Called after a booking becomes checked_in (tap or walk-in). Updates the counters and awards badges.
-- Check-ins only ever happen on the booking date, so dates arrive in order. Takes an id rather than
-- a bookings row so PostgREST does not expose it as a computed column of bookings.
create function public.bmd_record_checkin(p_booking_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  p_booking public.bookings;
  v_settings public.settings;
  v_stats public.user_stats;
  v_week date;
  v_last_week date;
  v_active_seats integer;
  v_booked_seats integer;
  v_people integer;
  v_checked_in integer;
  v_no_shows integer;
  v_new text[] := '{}';
begin
  select * into p_booking from public.bookings b where b.id = p_booking_id;
  if not found or p_booking.status <> 'checked_in' then raise exception 'booking_not_active'; end if;
  v_week := date_trunc('week', p_booking.date::timestamp)::date;
  select * into v_settings from public.settings limit 1;

  insert into public.user_stats (user_id) values (p_booking.user_id) on conflict (user_id) do nothing;
  select * into v_stats from public.user_stats where user_id = p_booking.user_id for update;

  if v_stats.last_office_day is distinct from p_booking.date then
    v_stats.office_days := v_stats.office_days + 1;
    v_last_week := date_trunc('week', v_stats.last_office_day::timestamp)::date;
    v_stats.current_streak := case
      when v_last_week is null then 1
      when v_last_week = v_week then v_stats.current_streak
      when v_last_week = v_week - 7 then v_stats.current_streak + 1
      else 1
    end;
    v_stats.best_streak := greatest(v_stats.best_streak, v_stats.current_streak);
    v_stats.last_office_day := greatest(v_stats.last_office_day, p_booking.date);
  end if;
  if not (p_booking.seat_id = any (v_stats.seats_used)) then
    v_stats.seats_used := v_stats.seats_used || p_booking.seat_id;
  end if;

  update public.user_stats
  set office_days = v_stats.office_days,
      current_streak = v_stats.current_streak,
      best_streak = v_stats.best_streak,
      last_office_day = v_stats.last_office_day,
      seats_used = v_stats.seats_used,
      updated_at = public.bmd_now()
  where user_id = p_booking.user_id;

  -- Badges
  v_new := v_new || public.bmd_award(p_booking.user_id, 'first_day');
  if v_stats.office_days >= 10 then v_new := v_new || public.bmd_award(p_booking.user_id, 'regular'); end if;
  if v_stats.office_days >= 50 then v_new := v_new || public.bmd_award(p_booking.user_id, 'resident'); end if;
  if cardinality(v_stats.seats_used) >= 6 then v_new := v_new || public.bmd_award(p_booking.user_id, 'explorer'); end if;
  if v_stats.current_streak >= 4 then v_new := v_new || public.bmd_award(p_booking.user_id, 'on_a_roll'); end if;
  if p_booking.checked_in_at is not null
     and (p_booking.checked_in_at at time zone v_settings.timezone)::time < '08:00' then
    v_new := v_new || public.bmd_award(p_booking.user_id, 'early_bird');
  end if;

  select count(*) into v_active_seats from public.seats s where s.active;
  select count(distinct b.seat_id) into v_booked_seats
  from public.bookings b join public.seats s on s.id = b.seat_id and s.active
  where b.date = p_booking.date and b.slot = p_booking.slot and b.status in ('booked', 'checked_in');
  if v_active_seats > 0 and v_booked_seats >= v_active_seats then
    v_new := v_new || public.bmd_award(p_booking.user_id, 'full_house');
  end if;

  select count(distinct b.user_id) into v_people
  from public.bookings b where b.date = p_booking.date and b.status in ('booked', 'checked_in');
  if v_people >= v_settings.team_day_threshold then
    v_new := v_new || public.bmd_award(p_booking.user_id, 'team_day');
  end if;

  -- Reliable: the last 30 days hold at least four check-ins and no auto-released booking.
  select count(*) filter (where b.status = 'checked_in'), count(*) filter (where b.status = 'released')
  into v_checked_in, v_no_shows
  from public.bookings b
  where b.user_id = p_booking.user_id and b.date > p_booking.date - 30 and b.date <= p_booking.date;
  if v_checked_in >= 4 and v_no_shows = 0 then
    v_new := v_new || public.bmd_award(p_booking.user_id, 'reliable');
  end if;

  return v_new;
end $$;

revoke all on function public.bmd_award(uuid, text) from public, anon, authenticated;
revoke all on function public.bmd_record_checkin(uuid) from public, anon, authenticated;

-- check_in: records progress; exempt seat owners may check in until the half day ends -------------

create or replace function public.check_in(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_now timestamp;
  v_booking public.bookings;
  v_exempt boolean;
  v_closes time;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.user_id <> v_user then raise exception 'not_your_booking'; end if;
  if v_booking.status <> 'booked' then raise exception 'booking_not_active'; end if;

  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;
  if v_booking.date <> v_now::date then raise exception 'checkin_not_today'; end if;

  -- An exempt owner is never auto-released, so the deadline does not apply; the half day's end does.
  v_exempt := v_settings.owner_checkin_exempt
    and exists (select 1 from public.seats s where s.id = v_booking.seat_id and s.owner_id = v_user);
  v_closes := case
    when v_exempt then (case v_booking.slot when 'AM' then v_settings.pm_start else '24:00'::time end)
    else (case v_booking.slot when 'AM' then v_settings.am_checkin_deadline else v_settings.pm_checkin_deadline end)
  end;
  if v_now::time > v_closes then raise exception 'checkin_closed'; end if;

  update public.bookings
  set status = 'checked_in', checked_in_at = public.bmd_now(), updated_at = public.bmd_now()
  where id = p_booking_id
  returning * into v_booking;

  perform public.bmd_record_checkin(v_booking.id);
  return v_booking;
end $$;

-- book_seat: a walk-in (booked after the deadline) is a check-in and is recorded as one -----------

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

    if v_status = 'checked_in' then perform public.bmd_record_checkin(v_booking.id); end if;
    return next v_booking;
  end loop;
  return;
end $$;
