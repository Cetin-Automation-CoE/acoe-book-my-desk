-- Web Push: each person's browser subscriptions, per-person switches, and the jobs that decide who
-- gets what. Sending happens in the send-push Edge Function, called through pg_net with a shared
-- secret kept in Vault. Nothing is sent until a person turns notifications on.

create extension if not exists pg_net;

-- Settings: where the sender lives and when the scheduled nudges go out (office time) --------------

alter table public.settings
  add column push_function_url text,
  add column push_evening_hour smallint not null default 17 check (push_evening_hour between 0 and 23),
  add column push_monday_hour smallint not null default 7 check (push_monday_hour between 0 and 23);
comment on column public.settings.push_function_url is
  'URL of the send-push Edge Function (https://<ref>.supabase.co/functions/v1/send-push). Null disables push.';

-- Subscriptions --------------------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
comment on table public.push_subscriptions is 'One row per browser/device that allowed notifications. Dead endpoints are removed by the sender.';

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
alter table public.push_subscriptions enable row level security;
create policy "push: own" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push: add own" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push: refresh own" on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push: remove own" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Per-person switches (readable by all like the rest of the profile; editable by the person) -------

alter table public.profiles
  add column notify_tomorrow boolean not null default true,
  add column notify_monday boolean not null default true,
  add column notify_team_day boolean not null default true;
grant select (notify_tomorrow, notify_monday, notify_team_day),
      update (notify_tomorrow, notify_monday, notify_team_day) on public.profiles to authenticated;

-- What was already sent, so a job that runs twice (or a trigger that fires often) stays quiet ------

create table public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);
revoke all on public.push_log from anon, authenticated;
alter table public.push_log enable row level security; -- no policies: the API never sees it

-- Deciding who gets what -------------------------------------------------------------------------

-- Evening before: everyone with a booking tomorrow who has a subscription and the switch on.
create function public.push_tomorrow_candidates(p_today date)
returns table (user_id uuid, title text, body text, url text, tag text, key text)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select b.user_id, array_agg(distinct s.code order by s.code) as codes,
           bool_and(b.slot = 'AM') as am_only, bool_and(b.slot = 'PM') as pm_only
    from public.bookings b join public.seats s on s.id = b.seat_id
    where b.date = p_today + 1 and b.status in ('booked', 'checked_in')
    group by b.user_id
  )
  select m.user_id,
         'Tomorrow: ' || array_to_string(m.codes, ' · '),
         case when m.am_only then 'Morning' when m.pm_only then 'Afternoon' else 'Full day' end || ' in the open space.',
         '#/bookings',
         'tomorrow',
         (p_today + 1)::text
  from mine m
  join public.profiles p on p.user_id = m.user_id and p.notify_tomorrow
  where exists (select 1 from public.push_subscriptions ps where ps.user_id = m.user_id)
    and not exists (select 1 from public.push_log l where l.user_id = m.user_id and l.kind = 'tomorrow' and l.key = (p_today + 1)::text)
$$;

-- Monday morning: people with no booking this week yet, with the free-seat count for today.
create function public.push_monday_candidates(p_today date)
returns table (user_id uuid, title text, body text, url text, tag text, key text)
language sql stable security definer set search_path = '' as $$
  with free_today as (
    select count(*) as n from public.seats s
    where s.active and s.owner_id is null and cardinality(s.owner_emails) = 0
      and not exists (select 1 from public.bookings b where b.seat_id = s.id and b.date = p_today and b.status in ('booked', 'checked_in'))
  )
  select p.user_id,
         'Plan your week',
         (select n from free_today) || ' free seats today. Where will you sit this week?',
         '#/',
         'monday',
         p_today::text
  from public.profiles p
  where p.notify_monday
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = p.user_id)
    and not exists (select 1 from public.bookings b where b.user_id = p.user_id and b.status in ('booked', 'checked_in')
                    and b.date >= p_today and b.date < p_today + 7)
    and not exists (select 1 from public.push_log l where l.user_id = p.user_id and l.kind = 'monday' and l.key = p_today::text)
$$;

-- Team day: once a day reaches the threshold, tell everyone not yet booked that day.
create function public.push_team_day_candidates(p_date date)
returns table (user_id uuid, title text, body text, url text, tag text, key text)
language sql stable security definer set search_path = '' as $$
  with people as (
    select count(distinct b.user_id) as n from public.bookings b
    where b.date = p_date and b.status in ('booked', 'checked_in')
  )
  select p.user_id,
         'Team day on ' || to_char(p_date, 'FMDay'),
         (select n from people) || ' colleagues are in on ' || to_char(p_date, 'FMDay DD Mon') || '. Join them?',
         '#/',
         'team-day',
         p_date::text
  from public.profiles p
  where p.notify_team_day
    and (select n from people) >= (select s.team_day_threshold from public.settings s limit 1)
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = p.user_id)
    and not exists (select 1 from public.bookings b where b.user_id = p.user_id and b.date = p_date and b.status in ('booked', 'checked_in'))
    and not exists (select 1 from public.push_log l where l.user_id = p.user_id and l.kind = 'team-day' and l.key = p_date::text)
$$;

-- Sending ------------------------------------------------------------------------------------------

-- Hands a batch to the Edge Function (async via pg_net) and logs it. Silent when push is not set up.
create function public.push_send(p_messages jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
  v_count integer := jsonb_array_length(coalesce(p_messages, '[]'::jsonb));
begin
  if v_count = 0 then return 0; end if;
  select s.push_function_url into v_url from public.settings s limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_shared_secret' limit 1;
  if v_url is null or v_secret is null then return 0; end if;

  insert into public.push_log (user_id, kind, key)
  select (m ->> 'user_id')::uuid, m ->> 'tag', m ->> 'key' from jsonb_array_elements(p_messages) m
  on conflict do nothing;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('messages', p_messages),
    timeout_milliseconds := 10000
  );
  return v_count;
end $$;

create function public.bmd_candidates_json(p_rows anyelement) returns jsonb
language sql immutable as $$ select to_jsonb(p_rows) $$;

-- Runs every hour; acts only at the configured office-time hours (pg_cron is UTC, so DST is handled here).
create function public.push_scheduled() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_now timestamp;
  v_today date;
  v_sent integer := 0;
  v_batch jsonb;
begin
  select * into v_settings from public.settings limit 1;
  v_now := public.bmd_now() at time zone v_settings.timezone;
  v_today := v_now::date;

  if extract(hour from v_now) = v_settings.push_evening_hour
     and extract(isodow from v_today + 1)::smallint = any (v_settings.working_days) then
    select jsonb_agg(to_jsonb(c)) into v_batch from public.push_tomorrow_candidates(v_today) c;
    v_sent := v_sent + public.push_send(v_batch);
  end if;

  if extract(hour from v_now) = v_settings.push_monday_hour and extract(isodow from v_today) = 1 then
    select jsonb_agg(to_jsonb(c)) into v_batch from public.push_monday_candidates(v_today) c;
    v_sent := v_sent + public.push_send(v_batch);
  end if;

  return v_sent;
end $$;

-- A booking that pushes a day over the threshold alerts everyone else (once per day).
create function public.push_team_day_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_batch jsonb;
begin
  if new.status in ('booked', 'checked_in') then
    select jsonb_agg(to_jsonb(c)) into v_batch from public.push_team_day_candidates(new.date) c;
    perform public.push_send(v_batch);
  end if;
  return new;
end $$;
create trigger bookings_team_day_push
  after insert on public.bookings
  for each row execute function public.push_team_day_trigger();

revoke all on function public.push_tomorrow_candidates(date) from public, anon, authenticated;
revoke all on function public.push_monday_candidates(date) from public, anon, authenticated;
revoke all on function public.push_team_day_candidates(date) from public, anon, authenticated;
revoke all on function public.push_send(jsonb) from public, anon, authenticated;
revoke all on function public.bmd_candidates_json(anyelement) from public, anon, authenticated;
revoke all on function public.push_scheduled() from public, anon, authenticated;
revoke all on function public.push_team_day_trigger() from public, anon, authenticated;

select cron.schedule('bookmydesk-push-scheduled', '5 * * * *', $$select public.push_scheduled()$$);
