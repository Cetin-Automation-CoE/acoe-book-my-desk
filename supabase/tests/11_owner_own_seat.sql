begin;
select plan(5);

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
select tests_tmp.create_user('owner@cetin.cz', 'a1000000-0000-4000-8000-00000000000a');
insert into public.seats (id, floor_id, code, owner_id) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', 'a1000000-0000-4000-8000-00000000000a'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', null);

select tests_tmp.freeze('2026-11-04 09:00:00+01');

-- The owner of a semi-fixed seat books that seat and no other
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'FULL')$$,
  'P0001', 'owner_own_seat_only', 'a seat owner cannot book a free seat elsewhere');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'FULL')$$,
  'a seat owner books their own seat');

-- Not even on a day they released their seat
select lives_ok($$select public.release_my_seat('51000000-0000-4000-8000-000000000001', '2026-11-06', 'FULL')$$,
  'the owner releases Friday');
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-06', 'FULL')$$,
  'P0001', 'owner_own_seat_only', 'a released day does not open other seats to the owner');

-- Everyone else is unaffected
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'FULL')$$,
  'a colleague without a seat books any free seat');

select * from finish();
rollback;
