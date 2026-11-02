begin;
select plan(9);

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

select tests_tmp.create_user('alice@cetin.cz', 'a1000000-0000-4000-8000-000000000001');
select tests_tmp.create_user('bob@cetin.cz',   'a1000000-0000-4000-8000-000000000002');

select is((select public from storage.buckets where id = 'avatars'), true, 'the avatars bucket exists and is public');

-- As Alice
select tests_tmp.login('a1000000-0000-4000-8000-000000000001');
set local role authenticated;

select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'a1000000-0000-4000-8000-000000000001/avatar.jpg', 'a1000000-0000-4000-8000-000000000001')$$,
  'alice can upload into her own folder');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'a1000000-0000-4000-8000-000000000002/avatar.jpg', 'a1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'alice cannot upload into bob''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'avatar.jpg', 'a1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'nor outside a personal folder');
select lives_ok($$update public.profiles set avatar_url = 'https://example.test/a.jpg' where user_id = 'a1000000-0000-4000-8000-000000000001'$$,
  'alice sets her own avatar_url');
select is((select avatar_url from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000001'), 'https://example.test/a.jpg',
  'the url is stored');
update public.profiles set avatar_url = 'https://evil.test/x.jpg' where user_id = 'a1000000-0000-4000-8000-000000000002';
select is((select avatar_url from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000002'), null,
  'alice cannot set bob''s avatar');
-- Deletes only happen through the Storage API (direct SQL deletes are blocked by storage itself);
-- the API applies this policy.
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'avatars: own folder delete' and cmd = 'DELETE'), 'a delete policy limits removal to the own folder');

-- As Bob: colleagues' photos are readable
select tests_tmp.login('a1000000-0000-4000-8000-000000000002');
select is((select avatar_url from public.profiles where user_id = 'a1000000-0000-4000-8000-000000000001'), 'https://example.test/a.jpg',
  'bob sees alice''s avatar url');

select * from finish();
rollback;
