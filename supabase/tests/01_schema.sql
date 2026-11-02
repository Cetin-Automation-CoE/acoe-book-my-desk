begin;
select plan(16);

-- Transaction-local helper: insert an auth user the way GoTrue would (fires the sign-up triggers).
create schema tests_tmp;
create function tests_tmp.create_user(p_email text, p_id uuid default gen_random_uuid()) returns uuid
language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          '{"provider":"email","providers":["email"]}', '{}', now(), now());
  return p_id;
end $$;

-- Tables
select has_table('public', 'settings', 'settings table exists');
select has_table('public', 'offices', 'offices table exists');
select has_table('public', 'floors', 'floors table exists');
select has_table('public', 'seats', 'seats table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'seat_releases', 'seat_releases table exists');

select is((select count(*) from public.settings), 1::bigint, 'settings holds exactly one row');
select is((select allowed_email_domains from public.settings), '{cetin.cz}'::text[], 'default email domain is cetin.cz');

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint, 'row level security is enabled on every public table');

-- Sign-up trigger: profile creation and domain enforcement
select lives_ok($$select tests_tmp.create_user('jane.doe@cetin.cz')$$, 'sign-up with an allowed domain succeeds');
select is((select display_name from public.profiles where email = 'jane.doe@cetin.cz'), 'Jane Doe',
  'profile is created with a display name derived from the email');
select is((select role::text from public.profiles where email = 'jane.doe@cetin.cz'), 'user', 'new profiles get the user role');

select throws_ok($$select tests_tmp.create_user('someone@gmail.com')$$, 'P0001', 'email_domain_not_allowed',
  'sign-up from another domain is rejected in the database');

update public.settings set allowed_email_domains = '{cetin.cz,example.com}';
select lives_ok($$select tests_tmp.create_user('bob@example.com')$$, 'a newly allowed domain is accepted');
select lives_ok($$select tests_tmp.create_user('Mixed.Case@CETIN.CZ')$$, 'domain check is case-insensitive');

select * from finish();
rollback;
