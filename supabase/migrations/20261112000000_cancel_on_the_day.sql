-- Cancel on the day (decision 73): a booking can be cancelled until the end of its day, also once the
-- day has started, so a seat someone will not use after all goes back to colleagues. Only days that
-- are already over are refused. Office days are untouched: a booking is still counted when its half
-- day starts, so a day cancelled after that stays counted (it started with a reservation).

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_today date;
  v_booking public.bookings;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.user_id <> v_user then raise exception 'not_your_booking'; end if;
  if v_booking.status = 'checked_in' then raise exception 'cannot_cancel'; end if;
  if v_booking.status <> 'booked' then raise exception 'booking_not_active'; end if;

  select * into v_settings from public.settings limit 1;
  v_today := (public.bmd_now() at time zone v_settings.timezone)::date;
  if v_booking.date < v_today then raise exception 'cannot_cancel'; end if;

  update public.bookings
  set status = 'cancelled', updated_at = public.bmd_now()
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end $$;
