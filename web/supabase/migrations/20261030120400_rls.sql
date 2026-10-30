-- Row Level Security. Every table is deny-by-default; each policy below grants one specific access.
-- auth.uid() / is_admin() are wrapped in (select ...) so Postgres evaluates them once per query.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'brands', 'sizes', 'colors', 'products', 'product_images',
    'product_variants', 'home_sections', 'banners', 'store_settings', 'content_pages', 'faq_items',
    'cart_items', 'wishlists', 'coupons', 'orders', 'order_items', 'order_status_history',
    'coupon_redemptions', 'inventory_movements', 'payments', 'returns', 'reviews',
    'newsletter_subscribers', 'contact_messages', 'admin_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Admin-only tables: full access for admins, nothing for anyone else.
do $$
declare
  t text;
begin
  foreach t in array array[
    'coupons', 'coupon_redemptions', 'inventory_movements', 'newsletter_subscribers', 'contact_messages'
  ] loop
    execute format(
      'create policy "Admins manage %1$s" on public.%1$I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end;
$$;

create policy "Admins read audit log" on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));

-- Catalogue & content: public reads (active rows), admin writes.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'brands', 'sizes', 'colors', 'products', 'product_images', 'product_variants',
    'home_sections', 'banners', 'content_pages', 'faq_items'
  ] loop
    execute format(
      'create policy "Admins manage %1$s" on public.%1$I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end;
$$;

create policy "Public reads active categories" on public.categories
  for select to anon, authenticated using (is_active);

create policy "Public reads active brands" on public.brands
  for select to anon, authenticated using (is_active);

create policy "Public reads sizes" on public.sizes
  for select to anon, authenticated using (true);

create policy "Public reads colors" on public.colors
  for select to anon, authenticated using (true);

create policy "Public reads active products" on public.products
  for select to anon, authenticated using (is_active);

create policy "Public reads images of active products" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

create policy "Public reads active variants" on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));

create policy "Public reads active home sections" on public.home_sections
  for select to anon, authenticated using (is_active);

create policy "Public reads live banners" on public.banners
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

create policy "Public reads content pages" on public.content_pages
  for select to anon, authenticated using (true);

create policy "Public reads active FAQs" on public.faq_items
  for select to anon, authenticated using (is_active);

-- Store settings: single row, publicly readable, only admins may edit (never insert/delete).
create policy "Public reads store settings" on public.store_settings
  for select to anon, authenticated using (true);

create policy "Admins update store settings" on public.store_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Profiles: users see and edit their own row (role changes blocked by trigger); admins see all.
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Personal data owned by the signed-in user.
do $$
declare
  t text;
begin
  foreach t in array array['addresses', 'cart_items', 'wishlists'] loop
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

create policy "Admins read addresses" on public.addresses
  for select to authenticated using ((select public.is_admin()));

-- Orders are created only by place_order(); customers read their own, admins manage all.
create policy "Customers read own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins update orders" on public.orders
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

do $$
declare
  t text;
begin
  foreach t in array array['order_items', 'order_status_history', 'payments', 'returns'] loop
    execute format(
      'create policy "Customers read own %1$s" on public.%1$I for select to authenticated
         using ((select public.is_admin()) or exists (
           select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())))', t);
  end loop;
end;
$$;

create policy "Admins update payments" on public.payments
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Admins manage returns" on public.returns
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Reviews: approved ones are public; verified buyers write their own; admins moderate.
create policy "Public reads approved reviews" on public.reviews
  for select to anon, authenticated
  using (is_approved or user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Verified buyers create reviews" on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_purchased(product_id));

create policy "Authors update own reviews" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Authors or admins delete reviews" on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
