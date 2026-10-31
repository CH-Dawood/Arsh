-- Duplicate-order protection. The checkout form sends a random key per attempt; a retried or
-- double-submitted request with the same key returns the order already placed instead of a second one.
-- Additive only: a nullable column and a partial unique index; existing orders are untouched.

alter table public.orders add column if not exists checkout_key uuid;
create unique index if not exists orders_checkout_key_key on public.orders (checkout_key) where checkout_key is not null;

create or replace function public.place_order(
  p_items jsonb,
  p_customer jsonb,
  p_payment_method public.payment_method,
  p_coupon_code text default null,
  p_user_id uuid default null
) returns table (order_id uuid, order_number text, total integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_settings     public.store_settings;
  v_phone        text := public.normalize_pk_phone(p_customer ->> 'phone');
  v_key          uuid;
  v_requested    integer;
  v_found        integer;
  v_available    integer;
  v_subtotal     integer;
  v_coupon_id    uuid;
  v_coupon_code  text;
  v_coupon_error text;
  v_discount     integer := 0;
  v_shipping     integer;
  v_order_id     uuid;
  v_number       text;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;
  if v_phone is null then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  if (p_customer ->> 'checkout_key') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_key := (p_customer ->> 'checkout_key')::uuid;
    -- Concurrent requests with the same key queue here; the later one then finds the first one's order.
    perform pg_advisory_xact_lock(hashtextextended(v_key::text, 0));
    return query
      select o.id, o.order_number, o.total from public.orders o
       where o.checkout_key = v_key and o.phone = v_phone;
    if found then
      return;
    end if;
  end if;

  select * into v_settings from public.store_settings where id = 1;
  if not v_settings.store_open then
    raise exception 'STORE_CLOSED' using errcode = 'P0001';
  end if;
  if not (
    (p_payment_method = 'cod' and v_settings.cod_enabled) or
    (p_payment_method = 'bank_transfer' and v_settings.bank_transfer_enabled)
  ) then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = 'P0001';
  end if;

  perform 1 from public.product_variants v
   where v.id in (select (e ->> 'variant_id')::uuid from jsonb_array_elements(p_items) e)
   order by v.id
   for update;

  select count(distinct e ->> 'variant_id') into v_requested from jsonb_array_elements(p_items) e;
  select count(*), count(*) filter (where l.is_available), coalesce(sum(l.unit_price * l.quantity), 0)
    into v_found, v_available, v_subtotal
    from private.cart_lines(p_items) l;

  if v_found <> v_requested or v_available <> v_requested then
    raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if nullif(btrim(p_coupon_code), '') is not null then
    perform 1 from public.coupons cp where lower(cp.code) = lower(btrim(p_coupon_code)) for update;
    select e.coupon_id, e.code, e.discount, e.error
      into v_coupon_id, v_coupon_code, v_discount, v_coupon_error
      from private.evaluate_coupon(p_coupon_code, v_subtotal, p_user_id, v_phone) e;
    if v_coupon_error is not null then
      raise exception '%', v_coupon_error using errcode = 'P0001';
    end if;
  end if;

  v_shipping := private.shipping_fee(v_subtotal - v_discount);

  loop
    v_number := 'ORD-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-'
                || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.orders o where o.order_number = v_number);
  end loop;

  insert into public.orders (
    order_number, user_id, customer_name, phone, email, city, address_line, postal_code, notes,
    subtotal, discount_total, shipping_fee, total, coupon_id, coupon_code, payment_method, whatsapp_opt_in, checkout_key
  ) values (
    v_number, p_user_id,
    btrim(p_customer ->> 'full_name'), v_phone,
    nullif(lower(btrim(p_customer ->> 'email')), ''),
    btrim(p_customer ->> 'city'), btrim(p_customer ->> 'address_line'),
    nullif(btrim(p_customer ->> 'postal_code'), ''), nullif(btrim(p_customer ->> 'notes'), ''),
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon_id, v_coupon_code, p_payment_method,
    coalesce((p_customer ->> 'whatsapp_opt_in')::boolean, false),
    v_key
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, variant_label, sku, image_path, unit_price, quantity
  )
  select v_order_id, l.product_id, l.variant_id, l.product_name, l.product_slug, l.variant_label,
         l.sku, l.image_path, l.unit_price, l.quantity
  from private.cart_lines(p_items) l;

  perform set_config('app.inventory_reason', 'order', true);
  perform set_config('app.inventory_order', v_order_id::text, true);
  update public.product_variants v
     set stock = v.stock - i.quantity
    from public.order_items i
   where i.order_id = v_order_id and i.variant_id = v.id;
  perform set_config('app.inventory_reason', '', true);
  perform set_config('app.inventory_order', '', true);

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, phone)
    values (v_coupon_id, v_order_id, p_user_id, v_phone);
    update public.coupons set times_used = times_used + 1 where id = v_coupon_id;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id)
  values (v_order_id, null, 'pending', p_user_id);

  insert into public.payments (order_id, method, amount)
  values (v_order_id, p_payment_method, v_subtotal - v_discount + v_shipping);

  if p_user_id is not null then
    delete from public.cart_items c
     where c.user_id = p_user_id
       and c.variant_id in (select i.variant_id from public.order_items i where i.order_id = v_order_id);
  end if;

  return query select v_order_id, v_number, v_subtotal - v_discount + v_shipping;
end;
$$;

revoke execute on function public.place_order(jsonb, jsonb, public.payment_method, text, uuid) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, public.payment_method, text, uuid) to service_role;
