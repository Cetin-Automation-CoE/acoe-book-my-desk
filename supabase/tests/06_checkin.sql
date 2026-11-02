begin;
select plan(22);

create schema tests_tmp;
create function tests_tmp.create_user(p_email text, p_id uuid default gen_random_uuid()) returns uuid
language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          '{"provider":"email","providers":["email"]}', '{}', now(), now());
  return p_id;
end $$;
create function tests_tmp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
create function tests_tmp.freeze(p_at timestamptz) returns void language plpgsql as $$
begin
  execute format('create or replace function public.bmd_now() returns timestamptz language sql stable as $f$ select %L::timestamptz $f$', p_at);
end $$;
grant usage on schema tests_tmp to authenticated;

insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.create_user('carol@cetin.cz', 'a1000000-0000-4000-8000-000000000003');
select tests_tmp.create_user('dave@cetin.cz',  'a1000000-0000-4000-8000-000000000004');
select tests_tmp.create_user('eve@cetin.cz',   'a1000000-0000-4000-8000-000000000005');
select tests_tmp.create_user('frank@cetin.cz', 'a1000000-0000-4000-8000-000000000006');
select tests_tmp.create_user('owner@cetin.cz', 'a1000000-0000-4000-8000-00000000000a');
insert into public.seats (id, floor_id, code, owner_id) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', 'a1000000-0000-4000-8000-00000000000a'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', null),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03', null),
  ('51000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-00000000aaaa', 'T04', null);

-- Counts below must not depend on whatever the local dev database holds (rolled back with the test).
delete from public.seat_releases;
delete from public.bookings;

-- Bookings inserted directly (as postgres) for Wednesday 2026-11-04
insert into public.bookings (id, seat_id, user_id, date, slot, status, checked_in_at) values
  ('b0000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-04', 'AM', 'booked', null),      -- alice, today AM
  ('b0000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', '2026-11-04', 'PM', 'booked', null),      -- bob, today PM
  ('b0000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', '2026-11-04', 'AM', 'checked_in', now()), -- carol, already in
  ('b0000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000004', '2026-11-03', 'AM', 'booked', null),      -- dave, yesterday, never checked in
  ('b0000000-0000-4000-8000-000000000005', '51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '2026-11-04', 'AM', 'booked', null),      -- owner on own seat
  ('b0000000-0000-4000-8000-000000000006', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'booked', null),      -- alice, tomorrow
  ('b0000000-0000-4000-8000-000000000007', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005', '2026-11-04', 'AM', 'booked', null),      -- eve, today AM
  ('b0000000-0000-4000-8000-000000000008', '51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005', '2026-11-04', 'PM', 'booked', null);      -- eve, today PM

-- 09:00 Prague on the day
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000006')$$, 'P0001', 'checkin_not_today',
  'check-in is only possible on the day');
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000001')$$, 'alice checks in before the deadline');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000001'), 'checked_in', 'status becomes checked_in');
select isnt((select checked_in_at from public.bookings where id = 'b0000000-0000-4000-8000-000000000001'), null, 'checked_in_at is recorded');
select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000001')$$, 'P0001', 'booking_not_active',
  'a booking cannot be checked in twice');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000001')$$, 'P0001', 'cannot_cancel',
  'a checked-in booking cannot be cancelled');

select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000001')$$, 'P0001', 'not_your_booking',
  'colleagues cannot check in for each other');

-- Cancel rule: before the slot starts only (AM starts 06:00, PM starts 13:00)
select tests_tmp.login('a1000000-0000-4000-8000-000000000005');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000007')$$, 'P0001', 'cannot_cancel',
  'an AM booking cannot be cancelled at 09:00 on the day');
select lives_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000008')$$,
  'a PM booking can still be cancelled at 09:00 on the day');

-- Auto-release at 10:30: AM deadline (10:00) has passed
reset role;
select tests_tmp.freeze('2026-11-04 10:30:00+01');
select is(public.auto_release_bookings(), 2, 'two unconfirmed bookings are released (eve today AM, dave yesterday)');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000007'), 'released', 'eve''s AM booking is released');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000004'), 'released', 'dave''s stale booking is released');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000002'), 'booked', 'bob''s PM booking waits for its own deadline');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000005'), 'booked', 'the seat owner is exempt from check-in');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000003'), 'checked_in', 'checked-in bookings are untouched');

update public.settings set owner_checkin_exempt = false;
select is(public.auto_release_bookings(), 1, 'with the exemption off the owner''s booking is released too');

select tests_tmp.freeze('2026-11-04 14:30:00+01');
select is(public.auto_release_bookings(), 1, 'after 14:00 the unconfirmed PM booking is released');

-- Late check-in is refused
select tests_tmp.freeze('2026-11-04 10:30:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot, status) values
  ('b0000000-0000-4000-8000-000000000009', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000006', '2026-11-04', 'AM', 'booked');
select tests_tmp.login('a1000000-0000-4000-8000-000000000006');
set local role authenticated;
select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000009')$$, 'P0001', 'checkin_closed',
  'check-in after the deadline is refused');
reset role;

-- Scheduled jobs
select is((select count(*) from cron.job where jobname = 'bookmydesk-auto-release'), 1::bigint, 'the auto-release cron job is scheduled');
select is((select count(*) from cron.job where jobname = 'bookmydesk-purge-old-bookings'), 1::bigint, 'the retention cron job is scheduled');

-- Retention: rows older than booking_retention_days (90) are purged
insert into public.bookings (id, seat_id, user_id, date, slot, status) values
  ('b0000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-07-01', 'AM', 'cancelled');
select is(public.purge_old_bookings(), 1, 'one old booking is purged');
select is((select count(*) from public.bookings where id = 'b0000000-0000-4000-8000-000000000010'), 0::bigint, 'the old booking is gone');

select * from finish();
rollback;
