-- First-run data: one office, one floor and seats B21101–B21112.
-- Applied by `supabase db reset` / `supabase start` locally and by `supabase db push --include-seed`
-- for the hosted project. Idempotent, so running it twice is harmless. Rename things freely.

insert into public.offices (id, name)
values ('0f000000-0000-4000-8000-000000000001', 'Main office')
on conflict (id) do nothing;

insert into public.floors (id, office_id, name, sort_order)
values ('f1000000-0000-4000-8000-000000000001', '0f000000-0000-4000-8000-000000000001', 'Floor 2', 1)
on conflict (id) do nothing;

-- sort_order is the room order the app draws: desks come in side-by-side pairs with the
-- even-numbered seat on the left (B21102 | B21101, then B21104 | B21103, ...).
insert into public.seats (floor_id, code, zone, sort_order)
select 'f1000000-0000-4000-8000-000000000001', 'B211' || lpad(n::text, 2, '0'), 'Open space',
       case when n % 2 = 0 then n - 1 else n + 1 end
from generate_series(1, 12) as n
on conflict (code) do nothing;

-- Semi-fixed seats: held for their owners from day one; owner_id links itself at their first sign-in.
update public.seats
set owner_emails = '{ma077535@cetin.cz,minarovic.martin@cetin.cz}', owner_name = 'Martin Minarovič'
where code = 'B21102';
update public.seats
set owner_emails = '{ji076400@cetin.cz,forman.jiri@cetin.cz}', owner_name = 'Jiří Forman'
where code = 'B21101';

-- Known colleagues: display name and role applied at first sign-in. Everyone has a name-style and an
-- ID-style address; both are listed so it does not matter which one they type.
insert into public.directory (email, display_name, role) values
  ('dominik.celuch@cetin.cz',    'Dominik Celuch',    'user'),
  ('x0567169@cetin.cz',          'Dominik Celuch',    'user'),
  ('forman.jiri@cetin.cz',       'Jiří Forman',       'user'),
  ('ji076400@cetin.cz',          'Jiří Forman',       'user'),
  ('barbora.markova@cetin.cz',   'Barbora Haase',     'user'),
  ('x0567080@cetin.cz',          'Barbora Haase',     'user'),
  ('dominik.horak@cetin.cz',     'Dominik Horák',     'user'),
  ('do079060@cetin.cz',          'Dominik Horák',     'user'),
  ('ondrej.hvorecky@cetin.cz',   'Ondrej Hvorecký',   'user'),
  ('on077794@cetin.cz',          'Ondrej Hvorecký',   'user'),
  ('simon.machac@cetin.cz',      'Šimon Machač',      'user'),
  ('x0569389@cetin.cz',          'Šimon Machač',      'user'),
  ('minarovic.martin@cetin.cz',  'Martin Minarovič',  'user'),
  ('ma077535@cetin.cz',          'Martin Minarovič',  'user'),
  ('penka.krystof@cetin.cz',     'Kryštof Pěnka',     'admin'),
  ('kr078468@cetin.cz',          'Kryštof Pěnka',     'admin'),
  ('bohdana.semiusova@cetin.cz', 'Bohdana Semiusova', 'user'),
  ('bo079046@cetin.cz',          'Bohdana Semiusova', 'user'),
  ('ondrej.tomecek@cetin.cz',    'Ondřej Tomeček',    'user'),
  ('x0567363@cetin.cz',          'Ondřej Tomeček',    'user'),
  ('martin.kloucek@cetin.cz',    'Martin Klouček',    'user'),
  ('ma077182@cetin.cz',          'Martin Klouček',    'user'),
  ('petr.funk@cetin.cz',         'Petr Funk',         'user'),
  ('pe078542@cetin.cz',          'Petr Funk',         'user')
on conflict (email) do update set display_name = excluded.display_name, role = excluded.role;
