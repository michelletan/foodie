-- Private bucket for batch photos (spec §5: private, signed URLs on read).
insert into storage.buckets (id, name, public)
values ('batch-photos', 'batch-photos', false)
on conflict (id) do nothing;

create policy "authenticated upload batch photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'batch-photos');
create policy "authenticated read batch photos" on storage.objects for select to authenticated
  using (bucket_id = 'batch-photos');
create policy "authenticated delete batch photos" on storage.objects for delete to authenticated
  using (bucket_id = 'batch-photos');
