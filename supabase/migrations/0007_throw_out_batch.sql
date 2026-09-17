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

grant execute on function public.throw_out_batch(uuid) to authenticated;
