begin;
select plan(48);

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
create function tests_tmp.has_badge(p_user uuid, p_badge text) returns boolean language sql as $$
  select exists (select 1 from public.achievements a where a.user_id = p_user and a.badge = p_badge)
$$;
create function tests_tmp.stat(p_user uuid, p_col text) returns integer language plpgsql as $$
declare v integer;
begin
  execute format('select %I from public.user_stats where user_id = $1', p_col) into v using p_user;
  return v;
end $$;
grant usage on schema tests_tmp to authenticated;

insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.create_user('carol@cetin.cz', 'a1000000-0000-4000-8000-000000000003');
select tests_tmp.create_user('owner@cetin.cz', 'a1000000-0000-4000-8000-00000000000a');
insert into public.seats (id, floor_id, code, owner_id) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', 'a1000000-0000-4000-8000-00000000000a'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', null),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03', null),
  ('51000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-00000000aaaa', 'T04', null),
  ('51000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-00000000aaaa', 'T05', null),
  ('51000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-00000000aaaa', 'T06', null),
  ('51000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-00000000aaaa', 'T07', null);

-- Day-wide counts (team day, full house) and the job's return values must not depend on dev data.
delete from public.seat_releases;
delete from public.bookings;

select is((select team_day_threshold from public.settings), 8, 'a team day needs 8 people by default');
select is((select count(*) from cron.job where jobname = 'bookmydesk-count-office-days'), 1::bigint,
  'the counting job is scheduled');

-- Wednesday 2026-11-04 (ISO week 45), 09:00: booking today's morning, which already started at 06:00
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-04', 'AM')$$, 'alice books this morning');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 1, 'a same-day booking counts right away');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 1, 'the streak starts at one week');
select is((select last_office_day from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), '2026-11-04'::date,
  'the last office day is recorded');
select isnt((select counted_at from public.bookings where seat_id = '51000000-0000-4000-8000-000000000002' and date = '2026-11-04'), null,
  'the booking is marked as counted');
select is((select array_agg(badge order by badge) from public.achievements where user_id = 'a1000000-0000-4000-8000-000000000001'),
  '{first_day}'::text[], 'the first office day earns the first badge');
select is((select count(*) from public.user_stats), 1::bigint, 'alice reads her own stats row');
select throws_ok($$insert into public.achievements (user_id, badge) values ('a1000000-0000-4000-8000-000000000001', 'resident')$$,
  '42501', null, 'badges cannot be self-awarded');
select throws_ok($$update public.user_stats set office_days = 99$$, '42501', null, 'stats cannot be edited');
select throws_ok($$select public.count_office_days()$$, '42501', null, 'the counting job is internal');
select throws_ok($$select public.bmd_count_office_day((select id from public.bookings where seat_id = '51000000-0000-4000-8000-000000000002' and date = '2026-11-04'))$$,
  '42501', null, 'the counter is internal');

-- The afternoon booked in the morning waits until 13:00
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000003', '2026-11-04', 'PM')$$, 'alice books this afternoon too');
select is((select counted_at from public.bookings where seat_id = '51000000-0000-4000-8000-000000000003' and date = '2026-11-04'), null,
  'an afternoon booked in the morning is not counted yet');
reset role;
select tests_tmp.freeze('2026-11-04 13:30:00+01');
select is(public.count_office_days(), 1, 'the job counts it once the afternoon starts');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 1, 'two half days are one office day');
select is((select cardinality(seats_used) from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2,
  'both seats count as used');

-- Thursday: a booking made in advance is counted by the job when its morning starts
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM');
select tests_tmp.freeze('2026-11-05 06:30:00+01');
select is(public.count_office_days(), 1, 'Thursday morning is counted at 06:30');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 2, 'second office day');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 1, 'another day in the same week keeps the streak at one');

-- Friday: nothing is counted before the half day starts
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', '2026-11-06', 'AM');
select tests_tmp.freeze('2026-11-06 05:30:00+01');
select is(public.count_office_days(), 0, 'a morning booking is not counted at 05:30');
select tests_tmp.freeze('2026-11-06 06:30:00+01');
select is(public.count_office_days(), 1, 'but it is at 06:30');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 3, 'third office day');

-- Tuesday 2026-11-10 (week 46): the streak grows
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', '2026-11-10', 'AM');
select tests_tmp.freeze('2026-11-10 06:30:00+01');
select public.count_office_days();
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 2, 'two weeks in a row');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'best_streak'), 2, 'best streak follows');

-- Thursday 2026-11-26 (week 48, week 47 skipped): the streak resets; explorer at six seats
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', '2026-11-26', 'AM');
select tests_tmp.freeze('2026-11-26 06:30:00+01');
select public.count_office_days();
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 1, 'a missed week resets the streak');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'best_streak'), 2, 'the best streak is kept');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 5, 'five office days so far');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'explorer'), 'six different seats earn explorer');

-- A cancelled booking is never an office day
insert into public.bookings (seat_id, user_id, date, slot, status) values
  ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-27', 'AM', 'cancelled');
select tests_tmp.freeze('2026-11-27 06:30:00+01');
select is(public.count_office_days(), 0, 'a cancelled booking is not counted');

-- A reservation counts even when it was auto-released for missing check-in (Monday 2026-11-30, week 49)
insert into public.bookings (seat_id, user_id, date, slot, status) values
  ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-30', 'AM', 'released');
select tests_tmp.freeze('2026-11-30 12:00:00+01');
select is(public.count_office_days(), 1, 'a released reservation still counts');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 6, 'sixth office day');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 2, 'the streak grows again');

-- Monday–Friday 2026-12-07..11 (week 50): a full week, the tenth day, a four-week streak
update public.user_stats set current_streak = 3 where user_id = 'a1000000-0000-4000-8000-000000000001';
insert into public.bookings (seat_id, user_id, date, slot)
select '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', d, 'AM'
from generate_series('2026-12-07'::date, '2026-12-11'::date, '1 day') d;
select tests_tmp.freeze('2026-12-11 06:30:00+01');
select is(public.count_office_days(), 5, 'five days are counted in one run, in date order');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'office_days'), 11, 'eleven office days');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'regular'), 'ten office days earn regular');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000001', 'current_streak'), 4, 'four weeks in a row');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'on_a_roll'), 'a four-week streak earns on a roll');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'full_week'), 'every working day of a week earns full week');

-- Team day (threshold lowered to 3): Monday 2026-12-14
update public.settings set team_day_threshold = 3;
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-12-14', 'AM'),
  ('51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', '2026-12-14', 'AM'),
  ('51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', '2026-12-14', 'PM');
select tests_tmp.freeze('2026-12-14 14:00:00+01');
select is(public.count_office_days(), 3, 'three people are counted');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'team_day'), 'three people booked make a team day');
select is(tests_tmp.stat('a1000000-0000-4000-8000-000000000002', 'office_days'), 1, 'bob gets his first office day');

-- Full house: Tuesday 2026-12-15 with only two active seats, both booked
update public.seats set active = false where code not in ('T01', 'T02'); -- seeded seats included
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '2026-12-15', 'AM'),
  ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-12-15', 'AM');
select tests_tmp.freeze('2026-12-15 06:30:00+01');
select is(public.count_office_days(), 2, 'the owner and alice are counted');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'full_house'), 'every active seat booked earns full house');

-- Progress is private
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from public.user_stats), 1::bigint, 'bob sees only his own stats');
select is((select count(*) from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 0::bigint,
  'alice''s stats are hidden from bob');
select is((select count(*) from public.achievements), 2::bigint, 'bob sees only his own badges');

select * from finish();
rollback;
