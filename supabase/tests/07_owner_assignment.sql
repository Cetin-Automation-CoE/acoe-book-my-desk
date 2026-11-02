begin;
select plan(18);

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

select tests_tmp.freeze('2026-11-04 09:00:00+01');

insert into public.offices (id, name) values ('0f000000-0000-4000-8000-00000000aaaa', 'Test office');
insert into public.floors (id, office_id, name) values ('f1000000-0000-4000-8000-00000000aaaa', '0f000000-0000-4000-8000-00000000aaaa', 'Floor 1');
insert into public.seats (id, floor_id, code, owner_emails, owner_name) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01', '{ma0001@cetin.cz,owner.one@cetin.cz}', 'Owner One'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02', '{}', null),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03', '{}', null);
insert into public.directory (email, display_name) values ('colleague.two@cetin.cz', 'Colleague Two');
insert into public.directory (email, display_name, role) values ('boss@cetin.cz', 'The Boss', 'admin');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');

-- A seat assigned by email is held even before its owner has ever signed in
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'P0001', 'seat_held', 'an unclaimed semi-fixed seat is held for its future owner');
reset role;

-- First sign-in with one of the owner's addresses links the seat and names the profile
select lives_ok($$select tests_tmp.create_user('MA0001@cetin.cz', 'a1000000-0000-4000-8000-00000000000a')$$,
  'the owner signs in with the ID-style address');
select is((select owner_id from public.seats where code = 'T01'), 'a1000000-0000-4000-8000-00000000000a',
  'the seat is linked to the owner at sign-in');
select is((select display_name from public.profiles where user_id = 'a1000000-0000-4000-8000-00000000000a'), 'Owner One',
  'the owner gets the name from the seat assignment instead of "Ma0001"');

select tests_tmp.login('a1000000-0000-4000-8000-00000000000a');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000001', '2026-11-05', 'AM')$$,
  'the linked owner can book the seat');
reset role;

-- A second account with the owner's other address does not steal the seat
select lives_ok($$select tests_tmp.create_user('owner.one@cetin.cz', 'a1000000-0000-4000-8000-00000000000b')$$,
  'the owner signs in again with the name-style address');
select is((select owner_id from public.seats where code = 'T01'), 'a1000000-0000-4000-8000-00000000000a',
  'the first linked account keeps the seat');

-- Directory names apply at sign-in
select tests_tmp.create_user('colleague.two@cetin.cz', 'a1000000-0000-4000-8000-000000000002');
select is((select display_name from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000002'), 'Colleague Two',
  'display name comes from the directory');
select is((select role::text from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000002'), 'user',
  'directory entries default to the user role');
select tests_tmp.create_user('boss@cetin.cz', 'a1000000-0000-4000-8000-000000000bb5');
select is((select role::text from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000bb5'), 'admin',
  'the directory can pre-assign the admin role');

-- Assigning a seat to someone who already signed in links immediately
update public.seats set owner_emails = '{colleague.two@cetin.cz}' where code = 'T02';
select is((select owner_id from public.seats where code = 'T02'), 'a1000000-0000-4000-8000-000000000002',
  'assigning owner_emails to an existing user links the seat');

-- Clearing the assignment frees the seat
update public.seats set owner_emails = '{}', owner_id = null where code = 'T02';
select is((select owner_id from public.seats where code = 'T02'), null, 'the seat has no owner after clearing');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$select public.book_seat('51000000-0000-4000-8000-000000000002', '2026-11-05', 'AM')$$,
  'a cleared seat is bookable by anyone');
reset role;

-- Addresses are normalised
update public.seats set owner_emails = '{" Mixed.Case@CETIN.CZ "}' where code = 'T03';
select is((select owner_emails from public.seats where code = 'T03'), '{mixed.case@cetin.cz}'::text[],
  'owner emails are trimmed and lower-cased');
insert into public.directory (email, display_name) values ('Upper.Case@CETIN.CZ', 'Upper Case');
select is((select count(*) from public.directory where email = 'upper.case@cetin.cz'), 1::bigint,
  'directory emails are lower-cased');
select is((select count(*) from public.seats where code = 'T03' and owner_id is null), 1::bigint,
  'an assignment to an unknown address stays unlinked until that person signs in');

-- Personal mailboxes: allowed only when an admin listed the address in the directory
insert into public.directory (email, display_name) values ('petra.private@gmail.com', 'Petra Private');
select lives_ok($$select tests_tmp.create_user('Petra.Private@gmail.com', 'a1000000-0000-4000-8000-000000000e01')$$,
  'a personal address listed in the directory can sign up');
select throws_ok($$select tests_tmp.create_user('stranger@gmail.com')$$, 'P0001', 'email_domain_not_allowed',
  'an unlisted personal address is still rejected');

select * from finish();
rollback;
