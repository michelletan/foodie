-- All 3 users have equal read access everywhere. Writes are narrower:
-- recipes/batches accept direct insert (no special logic needed); every
-- other mutation — void, hard delete, portion math, settings — has no
-- direct UPDATE policy at all and can only happen through the
-- SECURITY DEFINER functions in 0003_functions.sql, which enforce
-- admin-only checks themselves. This avoids needing column-level RLS
-- (Postgres RLS can't cleanly say "any user may set voided_at but only
-- an admin may set deleted_at" on the same table).

alter table public.users enable row level security;
alter table public.children enable row level security;
alter table public.recipes enable row level security;
alter table public.batches enable row level security;
alter table public.serving_events enable row level security;
alter table public.app_settings enable row level security;

create policy "read users" on public.users for select to authenticated using (true);
create policy "read children" on public.children for select to authenticated using (true);
create policy "read recipes" on public.recipes for select to authenticated using (true);
create policy "read batches" on public.batches for select to authenticated using (true);
create policy "read serving_events" on public.serving_events for select to authenticated using (true);
create policy "read app_settings" on public.app_settings for select to authenticated using (true);

create policy "insert recipes" on public.recipes for insert to authenticated
  with check (created_by = auth.uid());
create policy "update recipes" on public.recipes for update to authenticated
  using (true);

create policy "insert batches" on public.batches for insert to authenticated
  with check (prepared_by = auth.uid());
