-- Reserves hard delete for batches that were mistakenly created and never
-- actually used. Once anything has been served from a batch (even if later
-- voided), that serving history needs the batch to stick around so it
-- stays legible — void it or throw out the rest instead.
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

  if exists (
    select 1 from public.serving_events
    where batch_id = p_batch_id and deleted_at is null
  ) then
    raise exception 'This batch has servings logged against it — void it instead of deleting.';
  end if;

  update public.batches set deleted_at = now() where id = p_batch_id returning * into batch;
  if not found then
    raise exception 'Batch not found';
  end if;
  return batch;
end;
$$;
