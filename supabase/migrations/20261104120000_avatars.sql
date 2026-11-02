-- Profile photos: a public "avatars" bucket where each person may write only inside their own
-- folder (<user_id>/avatar.jpg), and profiles.avatar_url pointing at the current image.

alter table public.profiles add column avatar_url text;
comment on column public.profiles.avatar_url is 'Public URL of the profile photo in the avatars bucket; null for initials.';
grant select (avatar_url), update (avatar_url) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, '{image/jpeg,image/png,image/webp}')
on conflict (id) do nothing;

create policy "avatars: anyone reads" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars: own folder insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own folder update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
