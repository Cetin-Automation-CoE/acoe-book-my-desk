begin;
select plan(11);

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
insert into public.seats (id, floor_id, code) values
  ('51000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-00000000aaaa', 'T02'),
  ('51000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-00000000aaaa', 'T03');

-- Bookings inserted directly (as postgres) for Wednesday 2026-11-04
insert into public.bookings (id, seat_id, user_id, date, slot) values
  ('b0000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-04', 'AM'),
  ('b0000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', '2026-11-04', 'PM'),
  ('b0000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-11-05', 'AM'),
  ('b0000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', '2026-11-04', 'AM');

-- Cancel rule: before the half day starts only (AM starts 06:00, PM starts 13:00)
select tests_tmp.freeze('2026-11-04 09:00:00+01');
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000001')$$, 'P0001', 'cannot_cancel',
  'an AM booking cannot be cancelled at 09:00 on the day');
select lives_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000002')$$,
  'a PM booking can still be cancelled at 09:00 on the day');
select is((select status::text from public.bookings where id = 'b0000000-0000-4000-8000-000000000002'), 'cancelled', 'the booking is cancelled');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000002')$$, 'P0001', 'booking_not_active',
  'a cancelled booking cannot be cancelled again');
select lives_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000003')$$, 'a future booking can be cancelled');
select throws_ok($$select public.cancel_booking('b0000000-0000-4000-8000-000000000004')$$, 'P0001', 'not_your_booking',
  'colleagues cannot cancel each other''s bookings');
reset role;

-- There is no check-in any more
select hasnt_function('public', 'check_in', array['uuid'], 'check_in() is gone');
select hasnt_function('public', 'auto_release_bookings', 'auto_release_bookings() is gone');
select is((select count(*) from cron.job where jobname = 'bookmydesk-auto-release'), 0::bigint, 'the auto-release job is unscheduled');

-- Scheduled jobs
select is((select count(*) from cron.job where jobname = 'bookmydesk-purge-old-bookings'), 1::bigint, 'the retention cron job is scheduled');

-- Retention: rows older than booking_retention_days (90) are purged
insert into public.bookings (id, seat_id, user_id, date, slot, status) values
  ('b0000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', '2026-07-01', 'AM', 'cancelled');
select is(public.purge_old_bookings(), 1, 'one old booking is purged');

select * from finish();
rollback;
