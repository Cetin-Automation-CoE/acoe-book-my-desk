begin;
select plan(26);

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

-- Wednesday 2026-11-04 09:00 Prague: the window (booking_weeks = 2) runs to Friday 2026-11-13
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-03', 'AM')$$,
  'P0001', 'outside_window', 'yesterday cannot be booked');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'AM')$$,
  'Friday of this week is bookable');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-09', 'AM')$$,
  'next Monday is bookable: the window is this week and next');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-13', 'AM')$$,
  'Friday of next week is the last bookable day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-16', 'AM')$$,
  'P0001', 'outside_window', 'the Monday after next is outside the window');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-07', 'AM')$$,
  'P0001', 'not_working_day', 'Saturday of this week is not a working day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-08', 'PM')$$,
  'P0001', 'not_working_day', 'Sunday is not a working day either');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-04', 'AM')$$,
  'today AM can be booked while it is running');
select is((select status::text from public.bookings where seat_id = '51000000-0000-4000-8000-000000000001' and date = '2026-11-04'),
  'booked', 'a same-day booking is a plain booking');

-- 23:30 UTC on Nov 4 is already 00:30 on Nov 5 in Prague: the window must follow Prague, not UTC.
reset role;
select tests_tmp.freeze('2026-11-04 23:30:00+00');
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-04', 'PM')$$,
  'P0001', 'outside_window', 'after Prague midnight the previous day is gone even though UTC has not rolled over');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'AM')$$,
  'after Prague midnight Thursday is today and bookable');

-- Same day, 14:30 Prague: AM is over, PM can still be booked.
reset role;
select tests_tmp.freeze('2026-11-04 14:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-04', 'AM')$$,
  'P0001', 'slot_ended', 'a half day that already ended cannot be booked');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-04', 'PM')$$,
  'the current half day can still be booked');

-- Saturday 2026-11-07: the coming week opens up
reset role;
select tests_tmp.freeze('2026-11-07 10:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-07', 'PM')$$,
  'P0001', 'outside_window', 'the weekend itself is not bookable');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-09', 'AM')$$,
  'from the weekend, next Monday is bookable');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-13', 'AM')$$,
  'and next Friday');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-16', 'AM')$$,
  'and the week after it');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-23', 'AM')$$,
  'P0001', 'outside_window', 'but not a third week');

-- Weekly limit (off by default): max 2 distinct days per ISO week
reset role;
update public.settings set max_days_per_week = 2;
select tests_tmp.freeze('2026-11-02 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000004');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-03', 'AM')$$, 'weekly limit: first day');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$, 'weekly limit: second day');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-02', 'AM')$$,
  'P0001', 'weekly_limit', 'weekly limit: third distinct day in the same ISO week is rejected');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'PM')$$,
  'weekly limit: another half of an already booked day is fine');
reset role;
select tests_tmp.freeze('2026-11-09 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000004');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-09', 'AM')$$,
  'weekly limit: next ISO week starts fresh');

-- booking_weeks = 1 is the current week only; it cannot be zero
reset role;
select throws_ok($$update public.settings set booking_weeks = 0$$, '23514', null, 'booking_weeks is at least 1');
update public.settings set booking_weeks = 1;
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-10', 'AM')$$,
  'P0001', 'outside_window', 'with booking_weeks = 1 next week is outside the window');

-- Saturday becomes bookable once it is a working day
reset role;
update public.settings set max_days_per_week = null, working_days = '{1,2,3,4,5,6}';
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-07', 'AM')$$,
  'Saturday is bookable once added to working_days');

select * from finish();
rollback;
