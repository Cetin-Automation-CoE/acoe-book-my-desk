-- The team, one row per person, for "Out of office" on Who's in: whoever is on the team and has
-- neither a booking nor a held seat on a day is out of office. Nothing is stored; the app works it
-- out from this list and the day's bookings.
--
-- Raw profiles would not do: an account is created as soon as someone asks for a code, so a
-- colleague who first tried the quarantined work address and then the personal one has two, and
-- a mistyped address leaves an account nobody ever signed in to. So:
--   - directory people are one person each (both addresses merged), signed in or not;
--   - anyone else counts once they have actually signed in.
-- Names and photos only, never addresses. user_ids lists every account of the person, so a booking
-- made from either address counts as in.

create function public.team_roster()
returns table (user_ids uuid[], display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  with accounts as (
    select p.user_id, p.display_name, p.avatar_url, u.last_sign_in_at, d.display_name as listed_as
    from public.profiles p
    join auth.users u on u.id = p.user_id
    left join public.directory d on d.email = p.email
  ),
  people as (
    select d.display_name as person, d.display_name as listed_as
    from public.directory d
    group by d.display_name
    union all
    select a.user_id::text, null
    from accounts a
    where a.listed_as is null and a.last_sign_in_at is not null
  )
  select
    coalesce(array_agg(a.user_id order by a.last_sign_in_at desc nulls last) filter (where a.user_id is not null), '{}'),
    -- The name the person chose for themselves, else the directory's.
    coalesce(
      (array_agg(a.display_name order by a.last_sign_in_at desc) filter (where a.last_sign_in_at is not null))[1],
      p.listed_as
    ),
    (array_agg(a.avatar_url order by a.last_sign_in_at desc nulls last) filter (where a.avatar_url is not null))[1]
  from people p
  left join accounts a
    on (p.listed_as is not null and a.listed_as = p.listed_as)
    or (p.listed_as is null and a.user_id::text = p.person)
  group by p.person, p.listed_as
$$;
comment on function public.team_roster() is
  'One row per team member (directory people, merged across addresses, plus anyone else who has signed in): every account id, the display name and a photo. For "Out of office" on Who''s in.';

revoke all on function public.team_roster() from public, anon;
grant execute on function public.team_roster() to authenticated;
