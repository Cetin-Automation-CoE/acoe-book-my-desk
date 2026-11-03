-- Lunch plans: per person and day, a lunchbox or going out, so colleagues can plan lunch
-- together. Kept apart from bookings because a seat owner is in on a held day without one.
-- Everyone signed in can read them; only the person themselves writes theirs. No row = not said.

create type public.lunch as enum ('box', 'out');

create table public.lunch_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  lunch public.lunch not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
comment on table public.lunch_plans is 'Per person and day: brings a lunchbox (box) or goes out for lunch (out). No row means they have not said.';

grant select, insert, update, delete on public.lunch_plans to authenticated;
alter table public.lunch_plans enable row level security;
create policy "lunch_plans: read" on public.lunch_plans for select to authenticated using (true);
create policy "lunch_plans: own insert" on public.lunch_plans for insert to authenticated
  with check (user_id = auth.uid());
create policy "lunch_plans: own update" on public.lunch_plans for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lunch_plans: own delete" on public.lunch_plans for delete to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.lunch_plans;

-- Old plans go with the booking purge.
create or replace function public.purge_old_bookings() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_cutoff date;
  v_count integer;
begin
  select * into v_settings from public.settings limit 1;
  v_cutoff := (public.bmd_now() at time zone v_settings.timezone)::date - v_settings.booking_retention_days;

  delete from public.seat_releases where date < v_cutoff;
  delete from public.lunch_plans where date < v_cutoff;
  with purged as (delete from public.bookings where date < v_cutoff returning id)
  select count(*) into v_count from purged;
  return v_count;
end $$;
