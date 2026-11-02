begin;
select plan(19);

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
select tests_tmp.create_user('owner@cetin.cz', 'a1000000-0000-4000-8000-00000000000a');
insert into public.seats (id, floor_id, code, owner_id) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', 'a1000000-0000-4000-8000-00000000000a'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', null);

select tests_tmp.freeze('2026-11-04 09:00:00+01');

-- Alice (not the owner)
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'P0001', 'seat_held', 'an owned seat is not bookable by others');
select throws_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'P0001', 'not_seat_owner', 'only the owner can release a seat');

-- Owner
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'the owner can book their own seat');
select lives_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'the owner releases Thursday AM');
select is((select count(*) from public.seat_releases where seat_id = '51000000-0000-4000-8000-000000000001' and date = '2026-11-05' and slot = 'AM'),
  1::bigint, 'a release row exists for Thursday AM');
select is((select status::text from public.bookings where user_id = 'a1000000-0000-4000-8000-00000000000a' and date = '2026-11-05'),
  'cancelled', 'releasing cancels the owner''s own booking for that half day');
select throws_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'AM')$$,
  'P0001', 'not_seat_owner', 'the owner cannot release someone else''s seat');
select throws_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'XX')$$,
  'P0001', 'invalid_slot', 'release validates the slot');
select throws_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-20', 'AM')$$,
  'P0001', 'outside_window', 'release follows the booking window');

-- Alice can now book the released half, but not the other half
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'a released half day is bookable by others');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'PM')$$,
  'P0001', 'seat_held', 'the unreleased half day stays held');

-- Owner cannot take back a half day a colleague has booked
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
select throws_ok($$select public.unrelease_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'P0001', 'seat_booked_by_other', 'a released half day cannot be taken back once booked');

-- Release a full day, take back the morning
select lives_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'FULL')$$,
  'the owner releases a full day');
select is((select count(*) from public.seat_releases where seat_id = '51000000-0000-4000-8000-000000000001' and date = '2026-11-06'),
  2::bigint, 'FULL creates two release rows');
select lives_ok($$select public.unrelease_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'AM')$$,
  'the owner takes back a free released half day');
select is((select count(*) from public.seat_releases where seat_id = '51000000-0000-4000-8000-000000000001' and date = '2026-11-06'),
  1::bigint, 'only the PM release remains');

select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'AM')$$,
  'P0001', 'seat_held', 'a taken-back half day is held again');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'PM')$$,
  'the still-released half day is bookable');

-- No session
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-07', 'AM')$$,
  'P0001', 'not_authenticated', 'release requires a signed-in user');

select * from finish();
rollback;
