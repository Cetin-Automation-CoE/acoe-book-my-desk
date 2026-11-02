begin;
select plan(46);

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

-- Day-wide counts (team day, full house) must not depend on whatever the dev database holds.
delete from public.seat_releases;
delete from public.bookings;

-- An old no-show of Alice's: blocks the "reliable" badge while it is inside the 30-day window.
insert into public.bookings (id, seat_id, user_id, date, slot, status) values
  ('b0000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-03', 'AM', 'released');

select is((select team_day_threshold from public.settings), 8, 'a team day needs 8 people by default');

-- Wednesday 2026-11-04 (ISO week 45), 09:00: first check-in ever
select tests_tmp.freeze('2026-11-04 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-04', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000002')$$, 'alice checks in');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 1,
  'the first check-in counts one office day');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 1,
  'the streak starts at one week');
select is((select last_office_day from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), '2026-11-04'::date,
  'the last office day is recorded');
select is((select array_agg(badge order by badge) from public.achievements where user_id = 'a1000000-0000-4000-8000-000000000001'),
  '{first_day}'::text[], 'only the first-day badge is earned at 09:00');
select is((select count(*) from public.user_stats), 1::bigint, 'alice reads her own stats row');
select throws_ok($$insert into public.achievements (user_id, badge) values ('a1000000-0000-4000-8000-000000000001', 'resident')$$,
  '42501', null, 'badges cannot be self-awarded');
select throws_ok($$update public.user_stats set office_days = 99$$, '42501', null, 'stats cannot be edited');
select throws_ok($$select public.bmd_record_checkin('b0000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'the recorder is internal');

-- Same day, 13:30: the afternoon half is the same office day
reset role;
select tests_tmp.freeze('2026-11-04 13:30:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', '2026-11-04', 'PM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000003')$$, 'alice checks in for the afternoon');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 1,
  'two half days are one office day');
select is((select cardinality(seats_used) from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2,
  'both seats count as used');

-- Thursday 07:30: early bird
reset role;
select tests_tmp.freeze('2026-11-05 07:30:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000004')$$, 'alice checks in early on Thursday');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'second office day');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 1,
  'another day in the same week keeps the streak at one');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'early_bird'), 'checking in before 08:00 earns early bird');

-- Friday 10:30: a walk-in booking after the deadline is checked in and counts too
reset role;
select tests_tmp.freeze('2026-11-06 10:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000005', '2026-11-06', 'AM')$$, 'alice walks in on Friday');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 3, 'a walk-in counts as an office day');

-- Tuesday 2026-11-10 (week 46): the streak grows
reset role;
select tests_tmp.freeze('2026-11-10 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000006', '51000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', '2026-11-10', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000006')$$, 'alice is in the following week');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'two weeks in a row');
select is((select best_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'best streak follows');

-- Thursday 2026-11-26 (week 48, week 47 skipped): the streak resets, explorer at six seats
reset role;
select tests_tmp.freeze('2026-11-26 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000007', '51000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', '2026-11-26', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000007')$$, 'alice is back after a week away');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 1, 'a missed week resets the streak');
select is((select best_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'the best streak is kept');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 5, 'five office days so far');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'explorer'), 'six different seats earn explorer');
select ok(not tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'reliable'), 'a no-show inside 30 days blocks reliable');

-- Thursday 2026-12-03 (week 49): the no-show has left the 30-day window
reset role;
select tests_tmp.freeze('2026-12-03 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000008', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-12-03', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000008')$$, 'alice checks in in December');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'reliable'), 'a month of check-ins without a no-show earns reliable');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 2, 'the streak grows again');

-- Friday 2026-12-04: tenth office day on a team day (threshold lowered to 3)
reset role;
update public.settings set team_day_threshold = 3;
update public.user_stats set office_days = 9 where user_id = 'a1000000-0000-4000-8000-000000000001';
select tests_tmp.freeze('2026-12-04 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000009', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', '2026-12-04', 'AM'),
  ('b0000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', '2026-12-04', 'AM'),
  ('b0000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000003', '2026-12-04', 'PM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000009')$$, 'alice checks in on a busy Friday');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 10, 'tenth office day');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'regular'), 'ten office days earn regular');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'team_day'), 'three people booked make a team day');

-- Monday 2026-12-07 (week 50): full house with two active seats; a 4-week streak
reset role;
update public.seats set active = false where code not in ('T01', 'T02'); -- seeded seats included
update public.user_stats set current_streak = 3 where user_id = 'a1000000-0000-4000-8000-000000000001';
select tests_tmp.freeze('2026-12-07 09:00:00+01');
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000012', '51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '2026-12-07', 'AM'),
  ('b0000000-0000-4000-8000-000000000013', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-12-07', 'AM');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000013')$$, 'alice checks in on a full day');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'full_house'), 'every active seat booked earns full house');
select is((select current_streak from public.user_stats where user_id = 'a1000000-0000-4000-8000-000000000001'), 4, 'four weeks in a row');
select ok(tests_tmp.has_badge('a1000000-0000-4000-8000-000000000001', 'on_a_roll'), 'a four-week streak earns on a roll');

-- Seat owners are exempt from auto-release but may still check in, until the half day ends
reset role;
select tests_tmp.freeze('2026-12-07 10:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
set local role authenticated;
select lives_ok($$select public.check_in('b0000000-0000-4000-8000-000000000012')$$, 'an exempt owner can check in after the deadline');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000012'), 'checked_in', 'the owner''s booking is checked in');
select is((select office_days from public.user_stats where user_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'the owner''s office day counts');
reset role;
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000015', '51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '2026-12-08', 'AM');
select tests_tmp.freeze('2026-12-08 13:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000015')$$, 'P0001', 'checkin_closed',
  'but not once the half day is over');
reset role;
update public.settings set owner_checkin_exempt = false;
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000016', '51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', '2026-12-09', 'AM');
select tests_tmp.freeze('2026-12-09 10:30:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok($$select public.check_in('b0000000-0000-4000-8000-000000000016')$$, 'P0001', 'checkin_closed',
  'without the exemption the deadline applies to owners too');

-- Progress is private
reset role;
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*) from public.user_stats), 0::bigint, 'colleagues'' stats are not readable');
select is((select count(*) from public.achievements), 0::bigint, 'colleagues'' badges are not readable');

select * from finish();
rollback;
