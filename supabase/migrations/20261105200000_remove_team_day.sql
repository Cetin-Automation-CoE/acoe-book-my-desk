-- Team day removed: no threshold, no day-strip marks or nudges, no badge, no push alert.
-- The "colleagues in" line on the Book tab stays; it never needed a threshold.

drop trigger if exists bookings_team_day_push on public.bookings;
drop function public.push_team_day_trigger();
drop function public.push_team_day_candidates(date);

alter table public.profiles drop column notify_team_day;

delete from public.achievements where badge = 'team_day';
alter table public.achievements drop constraint achievements_badge_check;
alter table public.achievements add constraint achievements_badge_check check (badge in (
  'first_day', 'regular', 'resident', 'explorer', 'full_house', 'on_a_roll', 'full_week'));

-- bmd_count_office_day without the team-day badge.
create or replace function public.bmd_count_office_day(p_booking_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings;
  v_settings public.settings;
  v_stats public.user_stats;
  v_week date;
  v_last_week date;
  v_active_seats integer;
  v_booked_seats integer;
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

  return v_new;
end $$;

alter table public.settings drop column team_day_threshold;
