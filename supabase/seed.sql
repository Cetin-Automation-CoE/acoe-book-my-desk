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

-- Semi-fixed seats: set owner_id on two seats once the owners are known (README "Admin tasks").
