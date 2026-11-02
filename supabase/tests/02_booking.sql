begin;
select plan(22);

-- Transaction-local helpers
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
grant usage on schema tests_tmp to authenticated;

-- Freeze "now" at Wednesday 2026-11-04 09:00 Prague time.
create or replace function public.bmd_now() returns timestamptz language sql stable as $$
  select '2026-11-04 09:00:00+01'::timestamptz
$$;

-- Fixtures
insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
insert into public.seats (id, floor_id, code, active) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', true),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', true),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03', false);
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');

-- Partial unique indexes guard against races even if the function logic were bypassed.
select throws_ok($$
  insert into public.bookings (seat_id, user_id, date, slot, status) values
    ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'booked'),
    ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '2026-11-05', 'AM', 'booked')
$$, '23505', null, 'index rejects two active bookings for one seat, date and slot');
select throws_ok($$
  insert into public.bookings (seat_id, user_id, date, slot, status) values
    ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'booked'),
    ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'booked')
$$, '23505', null, 'index rejects two active bookings for one user, date and slot');
select lives_ok($$
  insert into public.bookings (seat_id, user_id, date, slot, status) values
    ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'cancelled'),
    ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', '2026-11-05', 'AM', 'booked')
$$, 'a cancelled booking does not block the seat');
delete from public.bookings;

-- book_seat as Alice
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'alice books T01 Thursday AM');
select is((select status::text from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000001'), 'booked',
  'the booking is stored with status booked');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'AM')$$,
  'P0001', 'user_already_booked', 'alice cannot hold two seats in the same half day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'XX')$$,
  'P0001', 'invalid_slot', 'slot must be AM, PM or FULL');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-05', 'PM')$$,
  'P0001', 'seat_inactive', 'inactive seats cannot be booked');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000099', '2026-11-05', 'PM')$$,
  'P0001', 'seat_not_found', 'unknown seats cannot be booked');

-- FULL books both halves atomically
select is((select count(*) from public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-06', 'FULL')), 2::bigint,
  'FULL creates an AM and a PM booking');

-- book_seat as Bob
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'P0001', 'seat_taken', 'bob cannot take a seat alice already holds');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'PM')$$,
  'bob books the free PM half of the same seat');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-06', 'FULL')$$,
  'P0001', 'seat_taken', 'FULL fails when one half is taken');
select is((select count(*) from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000002' and date = '2026-11-06'), 0::bigint,
  'a failed FULL booking leaves no half booked');

-- cancel_booking
select throws_ok($$select public.cancel_booking((select id from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000001' and slot = 'AM' and date = '2026-11-05'))$$,
  'P0001', 'not_your_booking', 'bob cannot cancel alice''s booking');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000000')$$,
  'P0001', 'booking_not_found', 'cancelling an unknown booking fails clearly');

select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
select lives_ok($$select public.cancel_booking((select id from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000001' and slot = 'AM' and date = '2026-11-05'))$$,
  'alice cancels her own booking');
select is((select status::text from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000001' and slot = 'AM' and date = '2026-11-05'), 'cancelled',
  'the cancelled booking keeps its row with status cancelled');
select throws_ok($$select public.cancel_booking((select id from public.bookings where user_id = 'a1000000-0000-4000-8000-000000000001' and slot = 'AM' and date = '2026-11-05'))$$,
  'P0001', 'booking_not_active', 'a booking cannot be cancelled twice');

select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'the seat is free again after the cancellation');

-- No session
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-07', 'AM')$$,
  'P0001', 'not_authenticated', 'book_seat requires a signed-in user');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000000')$$,
  'P0001', 'not_authenticated', 'cancel_booking requires a signed-in user');

select * from finish();
rollback;
