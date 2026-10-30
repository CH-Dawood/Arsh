-- Performance: one SELECT policy per table instead of two overlapping permissive ones
-- (Supabase advisor "multiple_permissive_policies"). Access rules are unchanged:
-- the public sees active rows, admins see everything and are the only writers.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('categories',       'Public reads active categories',          'is_active'),
      ('brands',           'Public reads active brands',              'is_active'),
      ('sizes',            'Public reads sizes',                      'true'),
      ('colors',           'Public reads colors',                     'true'),
      ('products',         'Public reads active products',            'is_active'),
      ('product_images',   'Public reads images of active products',  'exists (select 1 from public.products p where p.id = product_id and p.is_active)'),
      ('product_variants', 'Public reads active variants',            'is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active)'),
      ('home_sections',    'Public reads active home sections',       'is_active'),
      ('banners',          'Public reads live banners',               'is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())'),
      ('content_pages',    'Public reads content pages',              'true'),
      ('faq_items',        'Public reads active FAQs',                'is_active')
    ) t (tbl, public_policy, visible)
  loop
    execute format('drop policy %I on public.%I', 'Admins manage ' || r.tbl, r.tbl);
    execute format('drop policy %I on public.%I', r.public_policy, r.tbl);

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using ((%s) or (select public.is_admin()))',
      'Read ' || r.tbl, r.tbl, r.visible);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      'Admins insert ' || r.tbl, r.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'Admins update ' || r.tbl, r.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      'Admins delete ' || r.tbl, r.tbl);
  end loop;
end;
$$;

-- Addresses: owner manages own rows; admins may read all.
drop policy "Users manage own addresses" on public.addresses;
drop policy "Admins read addresses" on public.addresses;
create policy "Read addresses" on public.addresses
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Users insert own addresses" on public.addresses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own addresses" on public.addresses
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own addresses" on public.addresses
  for delete to authenticated using (user_id = (select auth.uid()));

-- Returns: "Customers read own returns" already lets admins read; admins keep write access.
drop policy "Admins manage returns" on public.returns;
create policy "Admins insert returns" on public.returns
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update returns" on public.returns
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete returns" on public.returns
  for delete to authenticated using ((select public.is_admin()));
