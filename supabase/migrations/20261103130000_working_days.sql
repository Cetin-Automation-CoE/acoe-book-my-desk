-- Only working days can be booked or released. ISO weekday numbers: 1 = Monday … 7 = Sunday.

alter table public.settings
  add column working_days smallint[] not null default '{1,2,3,4,5}'
  check (cardinality(working_days) > 0 and working_days <@ '{1,2,3,4,5,6,7}'::smallint[]);
comment on column public.settings.working_days is 'ISO weekdays (1 = Monday … 7 = Sunday) on which seats can be booked.';

create or replace function public.bmd_assert_window(p_date date, p_settings public.settings, p_today date) returns void
language plpgsql immutable as $$
begin
  if p_date < p_today or p_date > p_today + p_settings.booking_window_days then
    raise exception 'outside_window';
  end if;
  if not (extract(isodow from p_date)::smallint = any (p_settings.working_days)) then
    raise exception 'not_working_day';
  end if;
end $$;
