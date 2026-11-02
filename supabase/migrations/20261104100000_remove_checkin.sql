-- Check-in is gone: a reservation is enough. No deadlines, no auto-release, no "I'm here".
-- The booking_status values checked_in / released stay in the enum for rows written before this.

select cron.unschedule('bookmydesk-auto-release');
drop function public.auto_release_bookings();
drop function public.check_in(uuid);

alter table public.settings
  drop column am_checkin_deadline,
  drop column pm_checkin_deadline,
  drop column owner_checkin_exempt;

comment on column public.bookings.checked_in_at is 'Legacy: written by the former check-in feature; no longer set.';

-- book_seat: a same-day booking is a plain booking; it is counted as an office day at once when
-- its half day has already started.
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
    v_started := false;
    if p_date = v_today then
      if v_now::time >= (case v_slot when 'AM' then v_settings.pm_start else '24:00'::time end) then
        raise exception 'slot_ended';
      end if;
      v_started := v_now::time >= (case v_slot when 'AM' then v_settings.am_start else v_settings.pm_start end);
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
      insert into public.bookings (seat_id, user_id, date, slot)
      values (p_seat_id, v_user, p_date, v_slot)
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
