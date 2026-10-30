-- Removes everything added by demo-catalog.sql (Unsplash-photographed demo products, demo brands,
-- demo banners and demo category images). Real products, orders and settings are untouched.
-- Products that already appear in orders are deactivated instead of deleted, keeping order history intact.
begin;

create temporary table demo_products on commit drop as
  select distinct p.id
  from public.products p
  join public.product_images i on i.product_id = p.id
  where i.storage_path like 'https://images.unsplash.com/%';

update public.products set is_active = false
  where id in (select id from demo_products)
    and exists (select 1 from public.order_items oi where oi.product_id = products.id);

delete from public.products
  where id in (select id from demo_products)
    and not exists (select 1 from public.order_items oi where oi.product_id = products.id);

delete from public.brands b
  where b.slug in ('atelier-luxe', 'atelier-pret', 'atelier-lawn')
    and not exists (select 1 from public.products p where p.brand_id = b.id);

delete from public.banners where image_path like 'https://images.unsplash.com/%';
update public.home_sections set image_path = null where image_path like 'https://images.unsplash.com/%';

commit;
