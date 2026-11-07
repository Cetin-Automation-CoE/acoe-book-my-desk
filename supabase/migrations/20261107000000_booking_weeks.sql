-- The booking window spans whole working weeks: the planning week (the current week, or the coming
-- one from the weekend on) plus the weeks after it, `booking_weeks` in all. Default 2: this week and
-- next. 1 restores the current-week-only window.

alter table public.settings
  add column booking_weeks smallint not null default 2 check (booking_weeks between 1 and 8);

create or replace function public.bmd_assert_window(p_date date, p_settings public.settings, p_today date) returns void
language plpgsql immutable as $$
declare
  v_week_start date := date_trunc('week', p_today::timestamp)::date;
  v_last_working smallint := (select max(d) from unnest(p_settings.working_days) d);
begin
  if extract(isodow from p_today) > v_last_working then v_week_start := v_week_start + 7; end if;
  if p_date < p_today or p_date < v_week_start or p_date >= v_week_start + 7 * p_settings.booking_weeks then
    raise exception 'outside_window';
  end if;
  if not (extract(isodow from p_date)::smallint = any (p_settings.working_days)) then
    raise exception 'not_working_day';
  end if;
end $$;
