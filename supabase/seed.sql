-- First-run data: one office, one floor and seats B21101–B21112.
-- Applied by `supabase db reset` / `supabase start` locally and by `supabase db push --include-seed`
-- for the hosted project. Idempotent, so running it twice is harmless. Rename things freely.

insert into public.offices (id, name)
values ('0f000000-0000-4000-8000-000000000001', 'Main office')
on conflict (id) do nothing;

insert into public.floors (id, office_id, name, sort_order)
values ('f1000000-0000-4000-8000-000000000001', '0f000000-0000-4000-8000-000000000001', 'Floor 2', 1)
on conflict (id) do nothing;

insert into public.seats (floor_id, code, zone, sort_order)
select 'f1000000-0000-4000-8000-000000000001', 'B211' || lpad(n::text, 2, '0'), 'Open space', n
from generate_series(1, 12) as n
on conflict (code) do nothing;

-- Semi-fixed seats: held for their owners from day one; owner_id links itself at their first sign-in.
update public.seats
set owner_emails = '{ma077535@cetin.cz,minarovic.martin@cetin.cz}', owner_name = 'Martin Minarovič'
where code = 'B21102';
update public.seats
set owner_emails = '{ji076400@cetin.cz,forman.jiri@cetin.cz}', owner_name = 'Jiří Forman'
where code = 'B21101';

-- Known colleagues: sets the display name at first sign-in (add the rest of the team here).
insert into public.directory (email, display_name) values
  ('ma077535@cetin.cz', 'Martin Minarovič'),
  ('minarovic.martin@cetin.cz', 'Martin Minarovič'),
  ('ji076400@cetin.cz', 'Jiří Forman'),
  ('forman.jiri@cetin.cz', 'Jiří Forman')
on conflict (email) do update set display_name = excluded.display_name;
