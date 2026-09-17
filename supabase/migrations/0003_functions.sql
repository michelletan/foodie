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
-- are optional — a serving can be a free-text description, a photo, or (for
-- meal_type 'milk') nothing at all, matching ServeForm.jsx's validation.
create or replace function public.serve_meal(
  p_meal_type text,
  p_satisfaction_rating smallint,
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

-- Restores the batch's portions (if any were used); a no-op if already
-- voided (matches localBackend.js's voidServingEvent, which the unit tests
-- cover).
create or replace function public.void_serving_event(p_event_id uuid)
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
  if event.voided_at is not null then
    return event;
  end if;

  if event.batch_id is not null then
    update public.batches
      set portions_remaining = portions_remaining + event.portions_used
      where id = event.batch_id;
  end if;

  update public.serving_events
    set voided_at = now()
    where id = p_event_id
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

-- Admin-only. Still just sets deleted_at — nothing is ever actually
-- purged (see spec's Retention note) — the caller is responsible for
-- also removing the Storage photo, since that's outside SQL's reach.
create or replace function public.hard_delete_batch(p_batch_id uuid)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  batch public.batches;
begin
  perform public.require_admin();
  update public.batches set deleted_at = now() where id = p_batch_id returning * into batch;
  if not found then
    raise exception 'Batch not found';
  end if;
  return batch;
end;
$$;

create or replace function public.hard_delete_serving_event(p_event_id uuid)
returns public.serving_events
language plpgsql
security definer
set search_path = public
as $$
declare
  event public.serving_events;
begin
  perform public.require_admin();
  update public.serving_events set deleted_at = now() where id = p_event_id returning * into event;
  if not found then
    raise exception 'Serving event not found';
  end if;
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
