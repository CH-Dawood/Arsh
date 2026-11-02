-- Checkout refuses products in hidden categories; delivered orders can only be returned;
-- reordering saves in one transaction. No existing rows are changed.

------------------------------------------------------------------------------
-- Cart lines: a product in a hidden category is unavailable, like a hidden product.
-- quote_cart and place_order both read this function.
------------------------------------------------------------------------------

create or replace function private.cart_lines(p_items jsonb)
returns table (
  variant_id uuid, product_id uuid, quantity integer, unit_price integer, stock integer,
  is_available boolean, product_name text, product_slug text, sku text, variant_label text, image_path text
)
language sql stable set search_path = '' as $$
  with requested as (
    select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e
    group by 1
  )
  select
    v.id, p.id, r.quantity, coalesce(v.price_override, p.base_price), v.stock,
    v.is_active and p.is_active and cat.is_active and r.quantity between 1 and 10 and v.stock >= r.quantity,
    p.name, p.slug, v.sku, concat_ws(' / ', s.label, c.name),
    (select i.storage_path from public.product_images i
      where i.product_id = p.id order by i.sort_order, i.created_at limit 1)
  from requested r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  join public.categories cat on cat.id = p.category_id
  join public.sizes s on s.id = v.size_id
  left join public.colors c on c.id = v.color_id;
$$;

revoke execute on function private.cart_lines(jsonb) from public, anon, authenticated;

------------------------------------------------------------------------------
-- Order lifecycle: statuses before delivery can move freely (admin corrections),
-- pending..shipped can be cancelled, shipped and delivered can be returned, and a
-- delivered order can only be returned. Cancelled and returned are final.
------------------------------------------------------------------------------

create or replace function private.on_order_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_open text[] := array['pending', 'confirmed', 'processing', 'shipped'];
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status::text = any (v_open) and (new.status::text = any (v_open) or new.status = 'delivered')) or
    (old.status::text = any (v_open) and new.status = 'cancelled') or
    (old.status in ('shipped', 'delivered') and new.status = 'returned')
  ) then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001',
      detail = format('%s -> %s', old.status, new.status);
  end if;

  if new.status in ('cancelled', 'returned') then
    perform set_config('app.inventory_reason', case new.status when 'cancelled' then 'cancel' else 'return' end, true);
    perform set_config('app.inventory_order', new.id::text, true);
    update public.product_variants v
       set stock = v.stock + i.quantity
      from public.order_items i
     where i.order_id = new.id and i.variant_id = v.id;
    perform set_config('app.inventory_reason', '', true);
    perform set_config('app.inventory_order', '', true);
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at := now();
    if new.coupon_id is not null then
      update public.coupons set times_used = greatest(times_used - 1, 0) where id = new.coupon_id;
      delete from public.coupon_redemptions where order_id = new.id;
    end if;
  end if;

  if new.status = 'delivered' then
    new.delivered_at := now();
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, note, actor_id)
  values (new.id, old.status, new.status, nullif(current_setting('app.status_note', true), ''), (select auth.uid()));

  return new;
end;
$$;

------------------------------------------------------------------------------
-- Reordering: all rows change together or none do. RLS still applies (invoker rights);
-- the table list is fixed, and a stale list (rows added or removed since the page
-- loaded) is refused instead of leaving positions half-saved.
------------------------------------------------------------------------------

create function public.admin_set_order(p_table text, p_ids uuid[])
returns void
language plpgsql set search_path = '' as $$
declare
  v_total integer;
  v_matched integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_table not in ('categories', 'banners', 'faq_items', 'sizes') then
    raise exception 'INVALID_TABLE' using errcode = 'P0001';
  end if;
  if p_ids is null or cardinality(p_ids) = 0
     or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) then
    raise exception 'STALE_ORDER' using errcode = 'P0001';
  end if;

  -- Locks the rows, so two admins reordering at once take turns.
  execute format('select count(*) from (select 1 from public.%I for update) t', p_table) into v_total;
  execute format('select count(*) from public.%I where id = any ($1)', p_table) into v_matched using p_ids;
  if v_total <> cardinality(p_ids) or v_matched <> cardinality(p_ids) then
    raise exception 'STALE_ORDER' using errcode = 'P0001';
  end if;

  execute format(
    'update public.%I t set sort_order = o.pos * 10
       from unnest($1) with ordinality o (id, pos)
      where t.id = o.id and t.sort_order is distinct from o.pos * 10', p_table)
  using p_ids;
end;
$$;

revoke execute on function public.admin_set_order(text, uuid[]) from public, anon;
grant execute on function public.admin_set_order(text, uuid[]) to authenticated;
