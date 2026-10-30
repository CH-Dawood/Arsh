-- Storage buckets. Size and type limits are enforced by Supabase Storage itself,
-- in addition to the server-side checks done before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog',  'catalog',  true,  5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Catalogue images (products, categories, brands, banners, logo): anyone can view through the
-- public URL; only admins can upload, replace or delete.
create policy "Admins write catalog images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy "Admins update catalog images" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));

create policy "Admins delete catalog images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));

create policy "Admins list catalog images" on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));

-- Payment receipts are private. Customers upload through a server action (service role) after
-- the order number and phone are verified; only admins can read them.
create policy "Admins read receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (select public.is_admin()));
