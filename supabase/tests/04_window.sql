begin;
select plan(17);

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
insert into public.seats (id, floor_id, code) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02'),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.create_user('carol@cetin.cz', 'a1000000-0000-4000-8000-000000000003');
select tests_tmp.create_user('dave@cetin.cz',  'a1000000-0000-4000-8000-000000000004');

-- Wednesday 2026-11-04 09:00 Prague; window = today + 7 days
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-03', 'AM')$$,
  'P0001', 'outside_window', 'yesterday cannot be booked');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-11', 'AM')$$,
  'today + 7 is the last bookable day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-12', 'AM')$$,
  'P0001', 'outside_window', 'today + 8 is rejected');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-04', 'AM')$$,
  'today AM can be booked before the check-in deadline');
select is((select status::text from public.bookings where seat_id = '51000000-0000-4000-8000-000000000001' and date = '2026-11-04'),
  'booked', 'a booking made before the deadline still needs check-in');

-- 23:30 UTC on Nov 4 is already 00:30 on Nov 5 in Prague: the window must follow Prague, not UTC.
reset role;
select tests_tmp.freeze('2026-11-04 23:30:00+00');
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-04', 'PM')$$,
  'P0001', 'outside_window', 'after Prague midnight the previous day is gone even though UTC has not rolled over');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-12', 'AM')$$,
  'after Prague midnight the window already reaches Nov 12');

-- Same day, 14:30 Prague: AM is over, PM booking is auto-checked-in because its deadline (14:00) passed.
reset role;
select tests_tmp.freeze('2026-11-04 14:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-04', 'AM')$$,
  'P0001', 'slot_ended', 'a half day that already ended cannot be booked');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-04', 'PM')$$,
  'the current half day can still be booked');
select is((select status::text from public.bookings where seat_id = '51000000-0000-4000-8000-000000000003' and date = '2026-11-04'),
  'checked_in', 'booking after the check-in deadline counts as checked in');

-- Same day, 10:30 Prague: AM deadline (10:00) passed but AM has not ended -> walk-in, auto-checked-in.
reset role;
select tests_tmp.freeze('2026-11-04 10:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-04', 'AM')$$,
  'a walk-in can still take a free seat after the AM deadline');
select is((select status::text from public.bookings where seat_id = '51000000-0000-4000-8000-000000000002' and date = '2026-11-04' and slot = 'AM'),
  'checked_in', 'the walk-in booking is auto-checked-in');

-- Weekly limit (off by default): max 2 distinct days per ISO week
reset role;
update public.settings set max_days_per_week = 2;
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000004');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-05', 'AM')$$, 'weekly limit: first day');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-06', 'AM')$$, 'weekly limit: second day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-07', 'AM')$$,
  'P0001', 'weekly_limit', 'weekly limit: third distinct day in the same ISO week is rejected');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-06', 'PM')$$,
  'weekly limit: another half of an already booked day is fine');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-09', 'AM')$$,
  'weekly limit: next ISO week starts fresh');

select * from finish();
rollback;
