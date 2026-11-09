-- Favourite seat: one per person, picked with the heart on a seat sheet. The Book tab's card offers
-- it ahead of the most-booked seat. Only the person reads their own row; it is written through
-- set_favourite_seat() so an unknown or inactive seat, or another seat for a seat owner, is refused
-- with the same codes book_seat uses.

create table public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favourite_seat_id uuid references public.seats(id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.user_prefs is 'Per-person app preferences. favourite_seat_id is the seat the Book tab offers first; null = none picked.';

revoke all on public.user_prefs from anon, authenticated;
grant select on public.user_prefs to authenticated;
alter table public.user_prefs enable row level security;
create policy "user_prefs: own" on public.user_prefs for select to authenticated using (user_id = auth.uid());

-- Sets the caller's favourite seat; called without a seat (or with null) it clears it.
create or replace function public.set_favourite_seat(p_seat_id uuid default null)
returns public.user_prefs
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_seat public.seats;
  v_prefs public.user_prefs;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  if p_seat_id is not null then
    select * into v_seat from public.seats s where s.id = p_seat_id;
    if not found then raise exception 'seat_not_found'; end if;
    if not v_seat.active then raise exception 'seat_inactive'; end if;
    -- A seat owner books their own seat only, so no other seat can be their favourite.
    if exists (select 1 from public.seats s where s.owner_id = v_user and s.active and s.id <> p_seat_id) then
      raise exception 'owner_own_seat_only';
    end if;
  end if;

  insert into public.user_prefs (user_id, favourite_seat_id, updated_at)
  values (v_user, p_seat_id, now())
  on conflict (user_id) do update
    set favourite_seat_id = excluded.favourite_seat_id, updated_at = excluded.updated_at
  returning * into v_prefs;
  return v_prefs;
end $$;

revoke all on function public.set_favourite_seat(uuid) from public, anon;
grant execute on function public.set_favourite_seat(uuid) to authenticated;
