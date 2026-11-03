begin;
select plan(7);

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

select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.freeze('2026-11-04 09:00:00+01');

-- Alice says she brings a lunchbox on Thursday
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$insert into public.lunch_plans (user_id, date, lunch) values ('a1000000-0000-4000-8000-000000000001', '2026-11-05', 'box')$$,
  'a person records their own lunch plan');

-- Bob sees it but cannot touch it
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select is((select lunch::text from public.lunch_plans where user_id = 'a1000000-0000-4000-8000-000000000001' and date = '2026-11-05'),
  'box', 'colleagues can read each other''s lunch plans');
select throws_ok($$insert into public.lunch_plans (user_id, date, lunch) values ('a1000000-0000-4000-8000-000000000001', '2026-11-06', 'out')$$,
  '42501', null, 'nobody records a lunch plan for someone else');
update public.lunch_plans set lunch = 'out' where user_id = 'a1000000-0000-4000-8000-000000000001';
select is((select lunch::text from public.lunch_plans where user_id = 'a1000000-0000-4000-8000-000000000001' and date = '2026-11-05'),
  'box', 'nobody changes someone else''s lunch plan');

-- Alice changes her mind, then clears it
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
select lives_ok($$update public.lunch_plans set lunch = 'out' where user_id = 'a1000000-0000-4000-8000-000000000001' and date = '2026-11-05'$$,
  'a person changes their own lunch plan');
select lives_ok($$delete from public.lunch_plans where user_id = 'a1000000-0000-4000-8000-000000000001' and date = '2026-11-05'$$,
  'a person clears their own lunch plan');

-- Old plans go with the booking purge
reset role;
insert into public.lunch_plans (user_id, date, lunch) values ('a1000000-0000-4000-8000-000000000001', '2026-01-05', 'box');
select public.purge_old_bookings();
select is((select count(*) from public.lunch_plans), 0::bigint, 'the nightly purge drops old lunch plans');

select * from finish();
rollback;
