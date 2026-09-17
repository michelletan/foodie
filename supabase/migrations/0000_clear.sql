-- Drops everything the foodie migrations created, so 0001-0005 can be
-- re-run cleanly from scratch. Does NOT touch auth.users — your 3 logins
-- stay intact; you'll just re-run 0005's insert afterward to relink them
-- to the fresh public.users table.

drop table if exists public.serving_events cascade;
drop table if exists public.batches cascade;
drop table if exists public.recipes cascade;
drop table if exists public.children cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.users cascade;

drop function if exists public.require_admin();

drop policy if exists "authenticated upload batch photos" on storage.objects;
drop policy if exists "authenticated read batch photos" on storage.objects;
drop policy if exists "authenticated delete batch photos" on storage.objects;