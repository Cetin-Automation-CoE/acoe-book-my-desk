begin;
select plan(21);

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

-- Fixtures (as postgres)
insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
insert into public.seats (id, floor_id, code) values ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
insert into public.bookings (id, seat_id, user_id, date, slot, status) values
  ('b0000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM', 'booked');

-- As Alice (authenticated)
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select is((select count(*) from public.seats where code = 'T01'), 1::bigint, 'signed-in users can read seats');
select is((select count(*) from public.bookings where id = 'b0000000-0000-4000-8000-000000000001'), 1::bigint,
  'signed-in users can read bookings');
select is((select count(*) from public.settings), 1::bigint, 'signed-in users can read settings');
select is((select count(*) from public.seat_releases), 0::bigint, 'signed-in users can read releases');

select throws_ok($$insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-06', 'AM')$$,
  '42501', null, 'direct insert into bookings is blocked');
select throws_ok($$update public.bookings set status = 'cancelled'$$, '42501', null, 'direct update of bookings is blocked');
select throws_ok($$delete from public.bookings$$, '42501', null, 'direct delete of bookings is blocked');
select throws_ok($$insert into public.seat_releases (seat_id, date, slot, created_by) values
  ('51000000-0000-4000-8000-000000000001', '2026-11-06', 'AM', 'a1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'direct insert into seat_releases is blocked');
select throws_ok($$update public.settings set booking_window_days = 30$$, '42501', null, 'users cannot change settings');
select throws_ok($$insert into public.seats (floor_id, code) values ('f1000000-0000-4000-8000-00000000aaaa', 'T99')$$,
  '42501', null, 'non-admins cannot add seats');
update public.seats set owner_id = 'a1000000-0000-4000-8000-000000000001';
select is((select owner_id from public.seats where code = 'T01'), null, 'non-admins cannot assign seat owners');

select is((select count(*) from (select user_id, display_name from public.profiles
  where user_id in ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002')) p), 2::bigint,
  'display names of all colleagues are readable');
select throws_ok($$select email from public.profiles$$, '42501', null, 'colleagues'' emails are not readable');
select throws_ok($$select role from public.profiles$$, '42501', null, 'roles are not readable directly');
select lives_ok($$update public.profiles set display_name = 'Alice Updated' where user_id = 'a1000000-0000-4000-8000-000000000001'$$,
  'users can rename themselves');
update public.profiles set display_name = 'Hacked' where user_id = 'a1000000-0000-4000-8000-000000000002';
select is((select display_name from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000002'), 'Bob',
  'users cannot rename colleagues');
select is(public.is_admin(), false, 'alice is not an admin');
select throws_ok($$select public.admin_set_role('a1000000-0000-4000-8000-000000000001', 'admin')$$,
  'P0001', 'not_admin', 'non-admins cannot change roles');

-- As anon
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$select count(*) from public.seats$$, '42501', null, 'anonymous visitors cannot read seats');
select throws_ok($$select count(*) from public.bookings$$, '42501', null, 'anonymous visitors cannot read bookings');

-- As Bob, promoted to admin
reset role;
update public.profiles set role = 'admin' where user_id = 'a1000000-0000-4000-8000-000000000002';
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok($$update public.seats set owner_id = 'a1000000-0000-4000-8000-000000000001' where code = 'T01'$$,
  'admins can assign seat owners');

select * from finish();
rollback;
