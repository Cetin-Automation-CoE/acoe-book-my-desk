begin;
select plan(15);

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

insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.create_user('owner@cetin.cz', 'a1000000-0000-4000-8000-00000000000a');
insert into public.seats (id, floor_id, code, owner_id, active) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', 'a1000000-0000-4000-8000-00000000000a', true),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', null, true),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03', null, true),
  ('51000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-00000000aaaa', 'T04', null, false);

-- Alice picks a favourite, then changes it
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-000000000002')$$,
  'a person picks a favourite seat');
select lives_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-000000000003')$$,
  'picking another seat replaces the favourite');
select is((select favourite_seat_id from public.user_prefs where user_id = 'a1000000-0000-4000-8000-000000000001'),
  '51000000-0000-4000-8000-000000000003'::uuid, 'one favourite per person, the latest pick');

-- Inactive or unknown seats are refused
select throws_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-000000000004')$$,
  'P0001', 'seat_inactive', 'an inactive seat cannot be a favourite');
select throws_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-0000000000ff')$$,
  'P0001', 'seat_not_found', 'an unknown seat cannot be a favourite');

-- Writes go through the function only
select throws_ok($$insert into public.user_prefs (user_id, favourite_seat_id) values ('a1000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'nobody inserts into user_prefs directly');
select throws_ok($$update public.user_prefs set favourite_seat_id = null$$,
  '42501', null, 'nobody updates user_prefs directly');
select throws_ok($$delete from public.user_prefs$$,
  '42501', null, 'nobody deletes from user_prefs directly');

-- Bob cannot see Alice's favourite, and his own pick leaves hers alone
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select is((select count(*) from public.user_prefs), 0::bigint, 'a person sees only their own preferences');
select lives_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-000000000002')$$,
  'a second person picks their own favourite');
select results_eq($$select user_id, favourite_seat_id from public.user_prefs$$,
  $$values ('a1000000-0000-4000-8000-000000000002'::uuid, '51000000-0000-4000-8000-000000000002'::uuid)$$,
  'they see their own row only');

-- A seat owner's favourite can only be their own seat
select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
select throws_ok($$select public.set_favourite_seat('51000000-0000-4000-8000-000000000002')$$,
  'P0001', 'owner_own_seat_only', 'a seat owner cannot pick another seat as favourite');

-- Clearing
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
select lives_ok($$select public.set_favourite_seat(null)$$, 'null clears the favourite');
select is((select favourite_seat_id from public.user_prefs where user_id = 'a1000000-0000-4000-8000-000000000001'),
  null::uuid, 'the favourite is cleared');

-- Clearing touched the caller's row only
reset role;
select is((select favourite_seat_id from public.user_prefs where user_id = 'a1000000-0000-4000-8000-000000000002'),
  '51000000-0000-4000-8000-000000000002'::uuid, 'clearing leaves other people''s favourites alone');

select * from finish();
rollback;
