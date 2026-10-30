-- Business logic. Anything that touches money or stock runs here, inside one transaction.

------------------------------------------------------------------------------
-- Roles & profiles
------------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    public.normalize_pk_phone(new.raw_user_meta_data ->> 'phone')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Invoker rights on purpose: current_user is the API role of the caller.
create function private.guard_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_profile_role
  before update of role on public.profiles
  for each row execute function private.guard_profile_role();

------------------------------------------------------------------------------
-- Audit log: every write made by an admin is recorded with before/after data.
------------------------------------------------------------------------------

create function private.audit_admin_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if not public.is_admin() then
    return null;
  end if;
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, old_data, new_data)
  values (
    (select auth.uid()), lower(tg_op), tg_table_name,
    coalesce(v_new, v_old) ->> coalesce(nullif(tg_argv[0], ''), 'id'),
    v_old, v_new
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'product_variants', 'product_images', 'categories', 'brands', 'sizes', 'colors',
    'home_sections', 'banners', 'coupons', 'orders', 'payments', 'returns', 'reviews',
    'store_settings', 'faq_items', 'newsletter_subscribers'
  ] loop
    execute format(
      'create trigger audit_admin_change after insert or update or delete on public.%I
         for each row execute function private.audit_admin_change()', t);
  end loop;
end;
$$;

create trigger audit_admin_change
  after insert or update or delete on public.content_pages
  for each row execute function private.audit_admin_change('slug');

create trigger audit_admin_change
  after update of role on public.profiles
  for each row execute function private.audit_admin_change();

------------------------------------------------------------------------------
-- Inventory ledger: every stock change is logged automatically.
-- Callers label the change with set_config('app.inventory_reason' / 'app.inventory_order', ..., true).
------------------------------------------------------------------------------

create function private.log_stock_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    v_delta := new.stock;
  else
    v_delta := new.stock - old.stock;
  end if;

  if v_delta <> 0 then
    insert into public.inventory_movements (variant_id, delta, reason, order_id, actor_id)
    values (
      new.id,
      v_delta,
      coalesce(
        nullif(current_setting('app.inventory_reason', true), ''),
        case when v_delta > 0 then 'restock' else 'adjustment' end
      )::public.inventory_reason,
      nullif(current_setting('app.inventory_order', true), '')::uuid,
      (select auth.uid())
    );
  end if;
  return null;
end;
$$;

create trigger log_stock_change
  after insert or update of stock on public.product_variants
  for each row execute function private.log_stock_change();

------------------------------------------------------------------------------
-- Reviews: only admins can approve; any customer edit goes back to moderation.
------------------------------------------------------------------------------

create function public.has_purchased(p_product_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where i.product_id = p_product_id
      and o.user_id = (select auth.uid())
      and o.status = 'delivered'
  );
$$;

create function private.guard_review_approval() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.is_admin() then
    new.is_approved := false;
  end if;
  return new;
end;
$$;

create trigger guard_review_approval
  before insert or update on public.reviews
  for each row execute function private.guard_review_approval();

------------------------------------------------------------------------------
-- Order lifecycle: valid transitions only; cancel/return restocks exactly once.
------------------------------------------------------------------------------

create function private.on_order_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not exists (
    select 1
    from (values
      ('pending', 'confirmed'), ('pending', 'cancelled'),
      ('confirmed', 'processing'), ('confirmed', 'cancelled'),
      ('processing', 'shipped'), ('processing', 'cancelled'),
      ('shipped', 'delivered'), ('shipped', 'returned'),
      ('delivered', 'returned')
    ) t (from_status, to_status)
    where t.from_status = old.status::text and t.to_status = new.status::text
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

  insert into public.order_status_history (order_id, from_status, to_status, actor_id)
  values (new.id, old.status, new.status, (select auth.uid()));

  return new;
end;
$$;

create trigger on_order_status_change
  before update of status on public.orders
  for each row execute function private.on_order_status_change();

------------------------------------------------------------------------------
-- Pricing helpers (internal)
------------------------------------------------------------------------------

-- Turns a client cart [{variant_id, quantity}] into catalogue-priced lines.
create function private.cart_lines(p_items jsonb)
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
    v.is_active and p.is_active and r.quantity between 1 and 10 and v.stock >= r.quantity,
    p.name, p.slug, v.sku, concat_ws(' / ', s.label, c.name),
    (select i.storage_path from public.product_images i
      where i.product_id = p.id order by i.sort_order, i.created_at limit 1)
  from requested r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  join public.sizes s on s.id = v.size_id
  left join public.colors c on c.id = v.color_id;
$$;

create function private.evaluate_coupon(p_code text, p_subtotal integer, p_user_id uuid, p_phone text)
returns table (coupon_id uuid, code text, discount integer, error text)
language plpgsql stable set search_path = '' as $$
declare
  c public.coupons;
  v_discount integer;
begin
  select * into c from public.coupons cp where lower(cp.code) = lower(btrim(p_code));

  if not found or not c.is_active
     or (c.starts_at is not null and c.starts_at > now())
     or (c.expires_at is not null and c.expires_at <= now()) then
    return query select null::uuid, upper(btrim(p_code)), 0, 'COUPON_INVALID'::text;
    return;
  end if;
  if p_subtotal < c.min_order_amount then
    return query select c.id, c.code, 0, 'COUPON_MIN_ORDER'::text;
    return;
  end if;
  if c.usage_limit is not null and c.times_used >= c.usage_limit then
    return query select c.id, c.code, 0, 'COUPON_EXHAUSTED'::text;
    return;
  end if;
  if c.per_customer_limit is not null and (p_phone is not null or p_user_id is not null) and (
    select count(*) from public.coupon_redemptions r
    where r.coupon_id = c.id and (r.phone = p_phone or r.user_id = p_user_id)
  ) >= c.per_customer_limit then
    return query select c.id, c.code, 0, 'COUPON_LIMIT_REACHED'::text;
    return;
  end if;

  v_discount := case c.discount_type
    when 'percent' then floor(p_subtotal * c.value / 100.0)::integer
    else c.value
  end;
  v_discount := least(v_discount, coalesce(c.max_discount, v_discount), p_subtotal);

  return query select c.id, c.code, v_discount, null::text;
end;
$$;

-- Shipping is charged on the amount after discount; free at or above the threshold.
create function private.shipping_fee(p_amount integer) returns integer
language sql stable set search_path = '' as $$
  select case when p_amount >= s.free_shipping_threshold then 0 else s.shipping_fee end
  from public.store_settings s where s.id = 1;
$$;

------------------------------------------------------------------------------
-- Checkout API (server-only: executable by service_role, called after auth + rate limiting)
------------------------------------------------------------------------------

create function public.quote_cart(
  p_items jsonb, p_coupon_code text default null, p_user_id uuid default null, p_phone text default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lines    jsonb;
  v_subtotal integer;
  v_discount integer := 0;
  v_coupon   jsonb;
  v_c        record;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.product_name), '[]'::jsonb),
         coalesce(sum(l.unit_price * l.quantity) filter (where l.is_available), 0)
    into v_lines, v_subtotal
    from private.cart_lines(p_items) l;

  if nullif(btrim(p_coupon_code), '') is not null then
    select * into v_c
      from private.evaluate_coupon(p_coupon_code, v_subtotal, p_user_id, public.normalize_pk_phone(p_phone));
    v_discount := v_c.discount;
    v_coupon := jsonb_build_object('code', v_c.code, 'discount', v_c.discount, 'error', v_c.error);
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', case when v_subtotal = 0 then 0 else private.shipping_fee(v_subtotal - v_discount) end,
    'total', v_subtotal - v_discount
             + case when v_subtotal = 0 then 0 else private.shipping_fee(v_subtotal - v_discount) end,
    'coupon', v_coupon,
    'free_shipping_threshold', (select free_shipping_threshold from public.store_settings where id = 1)
  );
end;
$$;

create function public.place_order(
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
  v_requested    integer;
  v_found        integer;
  v_available    integer;
  v_subtotal     integer;
  v_coupon_id    uuid;
  v_coupon_code  text;
  v_coupon_error text;
  v_discount     integer := 0;
  v_shipping  integer;
  v_order_id  uuid;
  v_number    text;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;
  if v_phone is null then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  select * into v_settings from public.store_settings where id = 1;
  if not (
    (p_payment_method = 'cod' and v_settings.cod_enabled) or
    (p_payment_method = 'bank_transfer' and v_settings.bank_transfer_enabled)
  ) then
    -- Wallet and card gateways stay unavailable until their verified integrations are configured.
    raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Lock every requested variant (stable order avoids deadlocks) so concurrent checkouts cannot oversell.
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
    subtotal, discount_total, shipping_fee, total, coupon_id, coupon_code, payment_method
  ) values (
    v_number, p_user_id,
    btrim(p_customer ->> 'full_name'), v_phone,
    nullif(lower(btrim(p_customer ->> 'email')), ''),
    btrim(p_customer ->> 'city'), btrim(p_customer ->> 'address_line'),
    nullif(btrim(p_customer ->> 'postal_code'), ''), nullif(btrim(p_customer ->> 'notes'), ''),
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon_id, v_coupon_code, p_payment_method
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

-- Guest-safe tracking: requires the order number AND the phone used at checkout.
create function public.track_order(p_order_number text, p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'created_at', o.created_at,
    'city', o.city,
    'total', o.total,
    'courier', o.courier,
    'tracking_number', o.tracking_number,
    'tracking_url', o.tracking_url,
    'items', (
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'variant', i.variant_label, 'quantity', i.quantity)
                       order by i.created_at)
      from public.order_items i where i.order_id = o.id
    ),
    'history', (
      select jsonb_agg(jsonb_build_object('status', h.to_status, 'at', h.created_at) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id
    )
  )
  from public.orders o
  where o.order_number = upper(btrim(p_order_number))
    and o.phone = public.normalize_pk_phone(p_phone);
$$;

-- Fixed-window limiter backed by Postgres, so limits hold across serverless instances.
create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  insert into private.rate_limits as r (key) values (p_key)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

------------------------------------------------------------------------------
-- Search (invoker rights: row level security still applies)
------------------------------------------------------------------------------

create function public.search_products(p_query text, p_limit integer default 24, p_offset integer default 0)
returns setof public.products
language plpgsql stable set search_path = '' as $$
declare
  v_terms text[] := array(
    select t from regexp_split_to_table(lower(left(coalesce(p_query, ''), 100)), '[^[:alnum:]]+') t
    where t <> ''
  );
  v_query tsquery;
  v_like  text;
begin
  if cardinality(v_terms) = 0 then
    return;
  end if;
  -- Terms are alphanumeric only, so they are safe inside tsquery and LIKE patterns.
  v_query := to_tsquery('simple', array_to_string(array(select t || ':*' from unnest(v_terms) t), ' & '));
  v_like := '%' || array_to_string(v_terms, '%') || '%';

  return query
    select p.*
    from public.products p
    join public.categories c on c.id = p.category_id
    left join public.brands b on b.id = p.brand_id
    where p.is_active
      and (p.search_vector @@ v_query
           or p.name operator(extensions.%) p_query
           or c.name ilike v_like
           or b.name ilike v_like)
    order by ts_rank(p.search_vector, v_query) desc,
             extensions.similarity(p.name, p_query) desc,
             p.created_at desc
    limit least(greatest(p_limit, 1), 60)
    offset greatest(p_offset, 0);
end;
$$;

------------------------------------------------------------------------------
-- Admin API (callable by signed-in users; every function re-checks is_admin())
------------------------------------------------------------------------------

create function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_sales',      (select coalesce(sum(total), 0) from public.orders where payment_status = 'paid'),
    'total_orders',     (select count(*) from public.orders),
    'pending_orders',   (select count(*) from public.orders where status in ('pending', 'confirmed', 'processing')),
    'completed_orders', (select count(*) from public.orders where status = 'delivered'),
    'total_customers',  (select count(*) from public.profiles where role = 'customer'),
    'total_products',   (select count(*) from public.products),
    'low_stock',        (select count(*) from public.product_variants where is_active and stock <= 3),
    'sales_by_day', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'revenue', coalesce(r.revenue, 0), 'orders', coalesce(r.orders, 0))
                       order by d.day)
      from (select (v_today - g)::date as day from generate_series(0, 29) g) d
      left join (
        select (created_at at time zone 'Asia/Karachi')::date as day,
               sum(total) filter (where status <> 'cancelled') as revenue,
               count(*) as orders
        from public.orders
        where created_at >= now() - interval '31 days'
        group by 1
      ) r on r.day = d.day
    )
  );
end;
$$;

create function public.admin_set_payment_status(
  p_order_id uuid, p_status public.payment_status, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.orders set payment_status = p_status where id = p_order_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.payments
     set status = p_status,
         verified_by = (select auth.uid()),
         verified_at = now(),
         payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('admin_note', left(p_note, 500))
   where id = (select id from public.payments where order_id = p_order_id order by created_at desc limit 1);
end;
$$;

------------------------------------------------------------------------------
-- Execute permissions. Postgres grants EXECUTE to PUBLIC by default, so revoke first.
------------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.quote_cart(jsonb, text, uuid, text),
  public.place_order(jsonb, jsonb, public.payment_method, text, uuid),
  public.track_order(text, text),
  public.check_rate_limit(text, integer, integer)
from public, anon, authenticated;

grant execute on function
  public.quote_cart(jsonb, text, uuid, text),
  public.place_order(jsonb, jsonb, public.payment_method, text, uuid),
  public.track_order(text, text),
  public.check_rate_limit(text, integer, integer)
to service_role;

revoke execute on function
  public.admin_dashboard_stats(),
  public.admin_set_payment_status(uuid, public.payment_status, text),
  public.has_purchased(uuid)
from public, anon;
