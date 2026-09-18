-- Satisfaction rating is now optional (ServeForm.jsx no longer requires
-- tapping one). The existing range check already passes on null (a null
-- comparison isn't a violation), so only the not-null constraint needs to
-- go.
alter table public.serving_events alter column satisfaction_rating drop not null;

-- While here: the table's "something was actually served" check predates
-- the photo-only serving support added to the app layer, so it never
-- accounted for photo_path — a photo-only, non-milk serving would pass the
-- app's validation but fail here. Replace it with the complete rule.
alter table public.serving_events drop constraint serving_events_check;
alter table public.serving_events add constraint serving_events_check
  check (meal_type = 'milk' or batch_id is not null or description is not null or photo_path is not null);

-- Give p_satisfaction_rating a default too, so a direct RPC call that omits
-- it (as supabase-js does when the JS value is undefined) doesn't fail with
-- a missing-argument error.
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
