begin;
select plan(9);

create schema tests_tmp;
create function tests_tmp.create_user(p_email text, p_id uuid default gen_random_uuid(), p_signed_in boolean default true) returns uuid
language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), case when p_signed_in then now() end);
  return p_id;
end $$;
create function tests_tmp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant usage on schema tests_tmp to authenticated;

-- A clean slate (rolled back): no other accounts; Alice has a work and a personal address, Carol has not signed in yet.
delete from auth.users;
delete from public.directory;
insert into public.directory (email, display_name) values
  ('al000001@cetin.cz', 'Alice Adams'),
  ('alice.adams@example.com', 'Alice Adams'),
  ('carol.cole@example.com', 'Carol Cole');

-- Alice asked for a code at her work address (never arrived) and signed in with the personal one.
select tests_tmp.create_user('al000001@cetin.cz', 'b1000000-0000-4000-8000-000000000001', false);
select tests_tmp.create_user('alice.adams@example.com', 'b1000000-0000-4000-8000-000000000002');
-- Dave is not in the directory but signed in from an allowed domain.
select tests_tmp.create_user('dave.dole@cetin.cz', 'b1000000-0000-4000-8000-000000000003');
-- Someone mistyped an address and never signed in.
select tests_tmp.create_user('typo.typo@cetin.cz', 'b1000000-0000-4000-8000-000000000004', false);

update public.profiles set display_name = 'Ali Adams', avatar_url = 'https://example.com/a.jpg'
where user_id = 'b1000000-0000-4000-8000-000000000002';

select tests_tmp.login('b1000000-0000-4000-8000-000000000003');
set local role authenticated;

select is((select count(*) from public.team_roster()), 3::bigint,
  'the roster has one row per person: Alice, Carol and Dave');
select is((select cardinality(user_ids) from public.team_roster() where 'b1000000-0000-4000-8000-000000000002' = any (user_ids)), 2,
  'both of Alice''s accounts belong to her one row');
select is((select display_name from public.team_roster() where 'b1000000-0000-4000-8000-000000000002' = any (user_ids)), 'Ali Adams',
  'the name is the one the person chose on the account they signed in with');
select is((select avatar_url from public.team_roster() where 'b1000000-0000-4000-8000-000000000002' = any (user_ids)), 'https://example.com/a.jpg',
  'the photo comes along');
select is((select user_ids from public.team_roster() where display_name = 'Carol Cole'), '{}'::uuid[],
  'a directory person who has not signed in yet is on the roster without an account');
select is((select display_name from public.team_roster() where 'b1000000-0000-4000-8000-000000000003' = any (user_ids)), 'Dave Dole',
  'someone outside the directory is on the roster once they have signed in');
select is((select count(*) from public.team_roster() where 'b1000000-0000-4000-8000-000000000004' = any (user_ids)), 0::bigint,
  'an account nobody ever signed in to is not on the roster');

reset role;
select ok(not has_function_privilege('anon', 'public.team_roster()', 'execute'), 'signed-out visitors cannot read the roster');
select ok(has_function_privilege('authenticated', 'public.team_roster()', 'execute'), 'signed-in colleagues can read the roster');

select * from finish();
rollback;
