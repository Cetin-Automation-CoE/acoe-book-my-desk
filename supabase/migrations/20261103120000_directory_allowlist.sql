-- Sign-up is allowed for an address on an allowed domain OR for an address an admin listed in the
-- directory. The second path lets colleagues use a personal mailbox while the company mail gateway
-- quarantines the sign-in codes; strangers are still rejected because they are not listed.

create or replace function public.enforce_email_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_allowed text[];
  v_email text := lower(coalesce(new.email, ''));
  v_domain text := split_part(v_email, '@', 2);
begin
  if exists (select 1 from public.directory d where d.email = v_email) then
    return new;
  end if;

  select array(select lower(d) from unnest(s.allowed_email_domains) d) into v_allowed from public.settings s limit 1;
  if coalesce(array_length(v_allowed, 1), 0) > 0 and not (v_domain = any (v_allowed)) then
    raise exception 'email_domain_not_allowed'
      using hint = 'Allowed domains: ' || array_to_string(v_allowed, ', ') || '; other addresses must be listed in public.directory';
  end if;
  return new;
end $$;
