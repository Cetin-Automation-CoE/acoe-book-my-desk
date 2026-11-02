-- Gamification: office-day streaks, badges and the team-day threshold.
-- An office day is a day with a reservation. A booking is counted once its half day has started
-- (from then on it can no longer be cancelled): by a 15-minute cron job, or right away when the
-- booking is made after the start. Counters live in user_stats and badges in achievements so they
-- outlive the booking purge. Everything here is private: colleagues cannot read anyone's progress.

alter table public.settings
  add column team_day_threshold integer not null default 8 check (team_day_threshold > 0);
comment on column public.settings.team_day_threshold is
  'Distinct people booked on one day for it to count as a team day (day strip marker, nudges, the team_day badge).';

alter table public.bookings add column counted_at timestamptz;
comment on column public.bookings.counted_at is 'When this booking was counted as an office day; null until its half day starts.';
create index bookings_uncounted_idx on public.bookings (date, slot)
  where counted_at is null and status in ('booked', 'checked_in', 'released');

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  office_days integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  week_days integer not null default 0,
  last_office_day date,
  seats_used uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
comment on table public.user_stats is
  'Per-person counters kept beyond booking retention: office days (days with a reservation), streak of consecutive ISO weeks with an office day, days in the current week, seats sat in.';

create table public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null check (badge in (
    'first_day', 'regular', 'resident', 'explorer', 'full_house', 'team_day', 'on_a_roll', 'full_week')),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
comment on table public.achievements is 'Badges, awarded only by bmd_count_office_day().';

-- Privileges and row level security ---------------------------------------------------------------

revoke all on public.user_stats, public.achievements from anon, authenticated;
grant select on public.user_stats, public.achievements to authenticated;

alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;
create policy "user_stats: own" on public.user_stats for select to authenticated using (user_id = auth.uid());
create policy "achievements: own" on public.achievements for select to authenticated using (user_id = auth.uid());

-- Counting office days ----------------------------------------------------------------------------

-- Returns the badge as a one-element array when it is new, so callers can collect what was just earned.
create function public.bmd_award(p_user uuid, p_badge text) returns text[]
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.achievements (user_id, badge) values (p_user, p_badge) on conflict do nothing;
  if found then return array[p_badge]; end if;
  return '{}';
end $$;

-- Counts one booking as an office day (once), updates the person's counters and awards badges.
-- Bookings are counted in date order, so a date never arrives before an earlier one.
create function public.bmd_count_office_day(p_booking_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings;
  v_settings public.settings;
  v_stats public.user_stats;
  v_week date;
  v_last_week date;
  v_active_seats integer;
  v_booked_seats integer;
  v_people integer;
  v_new text[] := '{}';
begin
  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found or v_booking.counted_at is not null
     or v_booking.status not in ('booked', 'checked_in', 'released') then
    return '{}';
  end if;
  update public.bookings set counted_at = public.bmd_now() where id = p_booking_id;

  select * into v_settings from public.settings limit 1;
  insert into public.user_stats (user_id) values (v_booking.user_id) on conflict (user_id) do nothing;
  select * into v_stats from public.user_stats where user_id = v_booking.user_id for update;

  if v_stats.last_office_day is null or v_booking.date > v_stats.last_office_day then
    v_week := date_trunc('week', v_booking.date::timestamp)::date;
    v_last_week := date_trunc('week', v_stats.last_office_day::timestamp)::date;
    v_stats.office_days := v_stats.office_days + 1;
    v_stats.current_streak := case
      when v_last_week is null then 1
      when v_last_week = v_week then v_stats.current_streak
      when v_last_week = v_week - 7 then v_stats.current_streak + 1
      else 1
    end;
    v_stats.best_streak := greatest(v_stats.best_streak, v_stats.current_streak);
    v_stats.week_days := case when v_last_week = v_week then v_stats.week_days + 1 else 1 end;
    v_stats.last_office_day := v_booking.date;
  elsif v_booking.date < v_stats.last_office_day then
    -- A late arrival (the job did not run for a while): still a day, but the streak is left alone.
    v_stats.office_days := v_stats.office_days + 1;
  end if;
  if not (v_booking.seat_id = any (v_stats.seats_used)) then
    v_stats.seats_used := v_stats.seats_used || v_booking.seat_id;
  end if;

  update public.user_stats
  set office_days = v_stats.office_days,
      current_streak = v_stats.current_streak,
      best_streak = v_stats.best_streak,
      week_days = v_stats.week_days,
      last_office_day = v_stats.last_office_day,
      seats_used = v_stats.seats_used,
      updated_at = public.bmd_now()
  where user_id = v_booking.user_id;

  -- Badges
  v_new := v_new || public.bmd_award(v_booking.user_id, 'first_day');
  if v_stats.office_days >= 10 then v_new := v_new || public.bmd_award(v_booking.user_id, 'regular'); end if;
  if v_stats.office_days >= 50 then v_new := v_new || public.bmd_award(v_booking.user_id, 'resident'); end if;
  if cardinality(v_stats.seats_used) >= 6 then v_new := v_new || public.bmd_award(v_booking.user_id, 'explorer'); end if;
  if v_stats.current_streak >= 4 then v_new := v_new || public.bmd_award(v_booking.user_id, 'on_a_roll'); end if;
  if v_stats.week_days >= cardinality(v_settings.working_days) then
    v_new := v_new || public.bmd_award(v_booking.user_id, 'full_week');
  end if;

  select count(*) into v_active_seats from public.seats s where s.active;
  select count(distinct b.seat_id) into v_booked_seats
  from public.bookings b join public.seats s on s.id = b.seat_id and s.active
  where b.date = v_booking.date and b.slot = v_booking.slot and b.status in ('booked', 'checked_in', 'released');
  if v_active_seats > 0 and v_booked_seats >= v_active_seats then
    v_new := v_new || public.bmd_award(v_booking.user_id, 'full_house');
  end if;

  select count(distinct b.user_id) into v_people
  from public.bookings b where b.date = v_booking.date and b.status in ('booked', 'checked_in', 'released');
  if v_people >= v_settings.team_day_threshold then
    v_new := v_new || public.bmd_award(v_booking.user_id, 'team_day');
  end if;

  return v_new;
end $$;

-- Counts every booking whose half day has started. Scheduled every 15 minutes; safe to run any time.
create function public.count_office_days() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_now timestamp;
  v_id uuid;
  v_count integer := 0;
begin
  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;

  for v_id in
    select b.id from public.bookings b
    where b.counted_at is null and b.status in ('booked', 'checked_in', 'released')
      and (b.date < v_now::date
           or (b.date = v_now::date
               and v_now::time >= (case b.slot when 'AM' then v_settings.am_start else v_settings.pm_start end)))
    order by b.date, b.slot
  loop
    perform public.bmd_count_office_day(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.bmd_award(uuid, text) from public, anon, authenticated;
revoke all on function public.bmd_count_office_day(uuid) from public, anon, authenticated;
revoke all on function public.count_office_days() from public, anon, authenticated;

select cron.schedule('bookmydesk-count-office-days', '*/15 * * * *', $$select public.count_office_days()$$);

-- book_seat: a booking made after its half day started is counted at once ------------------------

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
  v_started boolean;
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
    v_started := false;

    if p_date = v_today then
      if v_now::time >= (case v_slot when 'AM' then v_settings.pm_start else '24:00'::time end) then
        raise exception 'slot_ended';
      end if;
      v_started := v_now::time >= (case v_slot when 'AM' then v_settings.am_start else v_settings.pm_start end);
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

    if v_started then perform public.bmd_count_office_day(v_booking.id); end if;
    return next v_booking;
  end loop;
  return;
end $$;
