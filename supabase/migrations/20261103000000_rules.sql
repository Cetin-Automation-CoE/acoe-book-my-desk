-- Booking rules: the rolling window, same-day slots, semi-fixed seats with releases, check-in,
-- auto-release of unconfirmed bookings and data retention. Scheduled jobs run on pg_cron.

create extension if not exists pg_cron;

-- Helpers -----------------------------------------------------------------------------------------

-- Wall-clock time in the office time zone (timestamp without time zone).
create function public.bmd_local_now() returns timestamp
language sql stable security definer set search_path = '' as $$
  select public.bmd_now() at time zone s.timezone from public.settings s limit 1
$$;

create function public.bmd_parse_slots(p_slot text) returns public.slot[]
language plpgsql immutable as $$
declare
  v_slots public.slot[] := case upper(p_slot)
    when 'AM' then array['AM'::public.slot]
    when 'PM' then array['PM'::public.slot]
    when 'FULL' then array['AM'::public.slot, 'PM'::public.slot]
    else null
  end;
begin
  if v_slots is null then raise exception 'invalid_slot'; end if;
  return v_slots;
end $$;

create function public.bmd_assert_window(p_date date, p_settings public.settings, p_today date) returns void
language plpgsql immutable as $$
begin
  if p_date < p_today or p_date > p_today + p_settings.booking_window_days then
    raise exception 'outside_window';
  end if;
end $$;

revoke all on function public.bmd_local_now() from public, anon, authenticated;
revoke all on function public.bmd_parse_slots(text) from public, anon, authenticated;
revoke all on function public.bmd_assert_window(date, public.settings, date) from public, anon, authenticated;

-- book_seat with the full rule set ----------------------------------------------------------------

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
      -- Booking after the check-in deadline means the person is already here: count it as checked in,
      -- otherwise the next auto-release run would free the seat immediately.
      if v_now::time > (case v_slot when 'AM' then v_settings.am_checkin_deadline else v_settings.pm_checkin_deadline end) then
        v_status := 'checked_in';
        v_checked_in_at := public.bmd_now();
      end if;
    end if;

    if v_seat.owner_id is not null and v_seat.owner_id <> v_user
       and not exists (select 1 from public.seat_releases r
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

-- cancel_booking: only before the half day starts --------------------------------------------------

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_now timestamp;
  v_booking public.bookings;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.user_id <> v_user then raise exception 'not_your_booking'; end if;
  if v_booking.status = 'checked_in' then raise exception 'cannot_cancel'; end if;
  if v_booking.status <> 'booked' then raise exception 'booking_not_active'; end if;

  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;
  if v_booking.date < v_now::date
     or (v_booking.date = v_now::date
         and v_now::time >= (case v_booking.slot when 'AM' then v_settings.am_start else v_settings.pm_start end)) then
    raise exception 'cannot_cancel';
  end if;

  update public.bookings
  set status = 'cancelled', updated_at = public.bmd_now()
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end $$;

-- check_in ----------------------------------------------------------------------------------------

create function public.check_in(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_now timestamp;
  v_booking public.bookings;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.user_id <> v_user then raise exception 'not_your_booking'; end if;
  if v_booking.status <> 'booked' then raise exception 'booking_not_active'; end if;

  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;
  if v_booking.date <> v_now::date then raise exception 'checkin_not_today'; end if;
  if v_now::time > (case v_booking.slot when 'AM' then v_settings.am_checkin_deadline else v_settings.pm_checkin_deadline end) then
    raise exception 'checkin_closed';
  end if;

  update public.bookings
  set status = 'checked_in', checked_in_at = public.bmd_now(), updated_at = public.bmd_now()
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end $$;

-- Semi-fixed seats: release / take back -----------------------------------------------------------

create function public.release_my_seat(p_seat_id uuid, p_date date, p_slot text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_seat public.seats;
  v_slots public.slot[];
  v_slot public.slot;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  v_slots := public.bmd_parse_slots(p_slot);

  select * into v_seat from public.seats s where s.id = p_seat_id;
  if not found then raise exception 'seat_not_found'; end if;
  if v_seat.owner_id is null or v_seat.owner_id <> v_user then raise exception 'not_seat_owner'; end if;

  select * into v_settings from public.settings limit 1;
  perform public.bmd_assert_window(p_date, v_settings, (public.bmd_now() at time zone v_settings.timezone)::date);

  foreach v_slot in array v_slots loop
    insert into public.seat_releases (seat_id, date, slot, created_by)
    values (p_seat_id, p_date, v_slot, v_user)
    on conflict (seat_id, date, slot) do nothing;

    -- Releasing means "I will not be here": drop the owner's own booking for that half day.
    update public.bookings
    set status = 'cancelled', updated_at = public.bmd_now()
    where seat_id = p_seat_id and date = p_date and slot = v_slot
      and user_id = v_user and status in ('booked', 'checked_in');
  end loop;
end $$;

create function public.unrelease_my_seat(p_seat_id uuid, p_date date, p_slot text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_settings public.settings;
  v_seat public.seats;
  v_slots public.slot[];
  v_slot public.slot;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  v_slots := public.bmd_parse_slots(p_slot);

  select * into v_seat from public.seats s where s.id = p_seat_id;
  if not found then raise exception 'seat_not_found'; end if;
  if v_seat.owner_id is null or v_seat.owner_id <> v_user then raise exception 'not_seat_owner'; end if;

  select * into v_settings from public.settings limit 1;
  perform public.bmd_assert_window(p_date, v_settings, (public.bmd_now() at time zone v_settings.timezone)::date);

  foreach v_slot in array v_slots loop
    if exists (select 1 from public.bookings b
               where b.seat_id = p_seat_id and b.date = p_date and b.slot = v_slot
                 and b.user_id <> v_user and b.status in ('booked', 'checked_in')) then
      raise exception 'seat_booked_by_other';
    end if;
    delete from public.seat_releases where seat_id = p_seat_id and date = p_date and slot = v_slot;
  end loop;
end $$;

-- Scheduled jobs ----------------------------------------------------------------------------------

create function public.auto_release_bookings() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_now timestamp;
  v_count integer;
begin
  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;

  with released as (
    update public.bookings b
    set status = 'released', updated_at = public.bmd_now()
    from public.seats s
    where s.id = b.seat_id
      and b.status = 'booked'
      and (b.date < v_now::date
           or (b.date = v_now::date
               and v_now::time > (case b.slot when 'AM' then v_settings.am_checkin_deadline else v_settings.pm_checkin_deadline end)))
      and not (v_settings.owner_checkin_exempt and s.owner_id is not distinct from b.user_id)
    returning b.id
  )
  select count(*) into v_count from released;
  return v_count;
end $$;

create function public.purge_old_bookings() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_cutoff date;
  v_count integer;
begin
  select * into v_settings from public.settings limit 1;
  v_cutoff := (public.bmd_now() at time zone v_settings.timezone)::date - v_settings.booking_retention_days;

  delete from public.seat_releases where date < v_cutoff;
  with purged as (delete from public.bookings where date < v_cutoff returning id)
  select count(*) into v_count from purged;
  return v_count;
end $$;

select cron.schedule('bookmydesk-auto-release', '*/15 * * * *', $$select public.auto_release_bookings()$$);
select cron.schedule('bookmydesk-purge-old-bookings', '30 3 * * *', $$select public.purge_old_bookings()$$);

-- Privileges --------------------------------------------------------------------------------------

revoke all on function public.check_in(uuid) from public, anon;
revoke all on function public.release_my_seat(uuid, date, text) from public, anon;
revoke all on function public.unrelease_my_seat(uuid, date, text) from public, anon;
grant execute on function public.check_in(uuid), public.release_my_seat(uuid, date, text),
  public.unrelease_my_seat(uuid, date, text) to authenticated;

revoke all on function public.auto_release_bookings() from public, anon, authenticated;
revoke all on function public.purge_old_bookings() from public, anon, authenticated;
