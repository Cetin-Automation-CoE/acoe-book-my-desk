-- Bookings are limited to the current working week: from today to the week's last working day.
-- Past the last working day (the weekend), the coming week is the one to plan.

alter table public.settings drop column booking_window_days;

create or replace function public.bmd_assert_window(p_date date, p_settings public.settings, p_today date) returns void
language plpgsql immutable as $$
declare
  v_week_start date := date_trunc('week', p_today::timestamp)::date;
  v_last_working smallint := (select max(d) from unnest(p_settings.working_days) d);
begin
  if extract(isodow from p_today) > v_last_working then v_week_start := v_week_start + 7; end if;
  if p_date < p_today or p_date < v_week_start or p_date >= v_week_start + 7 then
    raise exception 'outside_window';
  end if;
  if not (extract(isodow from p_date)::smallint = any (p_settings.working_days)) then
    raise exception 'not_working_day';
  end if;
end $$;
