-- SECURITY DEFINER functions carry out every mutation that isn't a plain
-- insert (see 0002_rls.sql for why). Each one maps 1:1 to a function in
-- src/lib/data/localBackend.js / supabaseBackend.js.

create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select role from public.users where id = auth.uid()) is distinct from 'admin' then
    raise exception 'Only an admin can do this';
  end if;
end;
$$;

create or replace function public.current_app_user()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
begin
  select * into u from public.users where id = auth.uid();
  if not found then
    raise exception 'No matching users row for the signed-in account';
  end if;
  return u;
end;
$$;

-- Atomically decrements portions_remaining and logs the serving in one
-- statement, so two people serving from the same batch at once can't
-- corrupt the count (see spec's "Portion math" note). batch_id/portions_used
-- and p_satisfaction_rating are all optional — a serving can be a free-text
-- description, a photo, or (for meal_type 'milk') nothing at all, matching
-- ServeForm.jsx's validation. p_satisfaction_rating defaults to null too, so
-- a direct RPC call that omits it (as supabase-js does when the JS value is
-- undefined) doesn't fail with a missing-argument error.
create or replace function public.serve_meal(
  p_meal_type text,
  p_satisfaction_rating smallint default null,
  p_batch_id uuid default null,
  p_portions_used integer default null,
  p_description text default null,
  p_photo_path text default null,
  p_notes text default null
)
returns public.serving_events
language plpgsql
security definer
set search_path = public
as $$
declare
  event public.serving_events;
begin
  if p_batch_id is not null then
    if p_portions_used is null or p_portions_used < 1 then
      raise exception 'portions_used is required when serving from a batch';
    end if;

    update public.batches
      set portions_remaining = portions_remaining - p_portions_used
      where id = p_batch_id
        and portions_remaining >= p_portions_used;

    if not found then
      raise exception 'Not enough portions remaining';
    end if;
  end if;

  insert into public.serving_events (
    batch_id, served_by, portions_used, meal_type, description, photo_path, satisfaction_rating, notes
  )
  values (
    p_batch_id, auth.uid(), p_portions_used, p_meal_type, p_description, p_photo_path, p_satisfaction_rating, p_notes
  )
  returning * into event;

  return event;
end;
$$;

create or replace function public.void_batch(p_batch_id uuid)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.batches;
begin
  update public.batches set voided_at = now() where id = p_batch_id returning * into batch;
  if not found then
    raise exception 'Batch not found';
  end if;
  return batch;
end;
$$;

-- "Throw out" a batch: zeroes portions_remaining (so it drops off the
-- freezer view, same as being fully served) without touching voided_at or
-- deleted_at, so the batch stays around for reference on the used-batches
-- view. Not admin-gated, same as void_batch — any user can do this.
create or replace function public.throw_out_batch(p_batch_id uuid)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.batches;
begin
  update public.batches set portions_remaining = 0 where id = p_batch_id returning * into batch;
  if not found then
    raise exception 'Batch not found';
  end if;
  return batch;
end;
$$;

-- Deletes a serving event in one step: reinstates the batch's portions (if
-- any were used), then marks the row deleted_at. Open to any user — see the
-- "delete/delete permanently" UX discussion; nothing here is more
-- destructive than void_batch already was (deleted_at, never an actual
-- purge).
create or replace function public.delete_serving_event(p_event_id uuid)
returns public.serving_events
language plpgsql
security definer
set search_path = public
as $$
declare
  event public.serving_events;
begin
  select * into event from public.serving_events where id = p_event_id;
  if not found then
    raise exception 'Serving event not found';
  end if;
  if event.deleted_at is not null then
    return event;
  end if;

  if event.batch_id is not null then
    update public.batches
      set portions_remaining = portions_remaining + event.portions_used
      where id = event.batch_id;
  end if;

  update public.serving_events
    set deleted_at = now()
    where id = p_event_id
    returning * into event;

  return event;
end;
$$;

create or replace function public.update_settings(p_low_stock_threshold integer)
returns public.app_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.app_settings;
begin
  perform public.require_admin();
  update public.app_settings set low_stock_threshold = p_low_stock_threshold where id = true
    returning * into settings;
  return settings;
end;
$$;

grant execute on all functions in schema public to authenticated;
