-- The send-push Edge Function reads subscriptions and removes dead ones as service_role. With
-- "auto-expose new tables" off, that role gets no privileges on new tables unless granted here.
grant select, delete on public.push_subscriptions to service_role;
