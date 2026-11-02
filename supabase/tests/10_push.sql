begin;
select plan(17);

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
insert into public.seats (id, floor_id, code) values
  ('51000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-00000000aaaa', 'T01'),
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02'),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03');
select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');
select tests_tmp.create_user('carol@cetin.cz', 'a1000000-0000-4000-8000-000000000003');
delete from public.bookings;
delete from public.push_subscriptions;

-- Subscriptions are personal
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('a1000000-0000-4000-8000-000000000001', 'https://push.example/alice', 'k', 'a')$$, 'alice registers her browser');
select throws_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('a1000000-0000-4000-8000-000000000002', 'https://push.example/x', 'k', 'a')$$, '42501', null,
  'she cannot register one for bob');
select lives_ok($$update public.profiles set notify_monday = false where user_id = 'a1000000-0000-4000-8000-000000000001'$$,
  'alice turns the Monday nudge off');
update public.profiles set notify_monday = false where user_id = 'a1000000-0000-4000-8000-000000000002';
select is((select notify_monday from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000002'), true,
  'but cannot change bob''s switches');
select throws_ok($$select public.push_scheduled()$$, '42501', null, 'the scheduler is internal');
select throws_ok($$select * from public.push_log$$, '42501', null, 'the send log is private');
reset role;

-- Bob subscribed too; Carol has no subscription
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('a1000000-0000-4000-8000-000000000002', 'https://push.example/bob', 'k', 'a');

-- Evening before Thursday 2026-11-05: alice (full day) and carol (no subscription) are booked
insert into public.bookings (seat_id, user_id, date, slot) values
  ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM'),
  ('51000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'PM'),
  ('51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', '2026-11-05', 'AM');
select is((select count(*) from public.push_tomorrow_candidates('2026-11-04')), 1::bigint,
  'only subscribed people with a booking tomorrow are reminded');
select is((select title from public.push_tomorrow_candidates('2026-11-04')), 'Tomorrow: T01', 'the reminder names the seat');
select is((select body from public.push_tomorrow_candidates('2026-11-04')), 'Full day in the open space.', 'and the half day');
select is((select count(*) from public.push_tomorrow_candidates('2026-11-05')), 0::bigint, 'nobody is booked on Friday');

-- Monday 2026-11-02: alice turned the nudge off, bob has nothing booked, carol is not subscribed
select is((select array_agg(user_id) from public.push_monday_candidates('2026-11-02')),
  array['a1000000-0000-4000-8000-000000000002']::uuid[], 'bob gets the Monday nudge');
select is((select body from public.push_monday_candidates('2026-11-02')),
  (select count(*) from public.seats s where s.active and s.owner_id is null and cardinality(s.owner_emails) = 0)
    || ' free seats today. Where will you sit this week?',
  'with the free-seat count');

-- Team day (threshold lowered to 2): alice and carol booked Thursday, bob is told
update public.settings set team_day_threshold = 2;
select is((select array_agg(user_id) from public.push_team_day_candidates('2026-11-05')),
  array['a1000000-0000-4000-8000-000000000002']::uuid[], 'the colleague not yet in is alerted');
select is((select count(*) from public.push_team_day_candidates('2026-11-04')), 0::bigint, 'a quiet day is no team day');

-- Sending is a no-op until the function URL and secret exist; the log still dedupes
select is(public.push_send('[{"user_id":"a1000000-0000-4000-8000-000000000002","tag":"monday","key":"2026-11-02"}]'::jsonb), 0,
  'without a sender configured nothing is sent');
select is((select count(*) from public.push_log), 0::bigint, 'and nothing is logged');
select is((select count(*) from cron.job where jobname = 'bookmydesk-push-scheduled'), 1::bigint, 'the hourly push job is scheduled');

select * from finish();
rollback;
