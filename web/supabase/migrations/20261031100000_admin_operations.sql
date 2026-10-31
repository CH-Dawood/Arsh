-- Admin operations: order status control, WhatsApp notification queue, inventory adjustments,
-- reporting functions, store operation settings and realtime. Reuses existing tables; adds only
-- notification_settings and notification_logs.

------------------------------------------------------------------------------
-- Columns
------------------------------------------------------------------------------

alter table public.products add column is_featured boolean not null default false;
create index products_featured_idx on public.products (created_at desc) where is_active and is_featured;

alter table public.orders
  add column delivered_at timestamptz,
  add column whatsapp_opt_in boolean not null default false;

alter table public.store_settings
  add column currency text not null default 'PKR' check (currency = 'PKR'),
  add column low_stock_threshold integer not null default 3 check (low_stock_threshold between 0 and 1000),
  add column store_open boolean not null default true,
  add column closed_message text check (char_length(closed_message) <= 200);

------------------------------------------------------------------------------
-- WhatsApp notifications
------------------------------------------------------------------------------

create type public.notification_event as enum (
  'order_placed', 'order_confirmed', 'order_processing', 'order_shipped', 'order_delivered', 'order_cancelled', 'test'
);
create type public.notification_status as enum ('pending', 'sending', 'sent', 'delivered', 'read', 'failed');

-- Admin-only (store_settings is public, so notification config lives here).
create table public.notification_settings (
  id         smallint primary key default 1 check (id = 1),
  enabled    boolean not null default false,
  events     jsonb not null default '{
    "order_placed":     {"enabled": true, "template": "order_placed",     "language": "en"},
    "order_confirmed":  {"enabled": true, "template": "order_confirmed",  "language": "en"},
    "order_processing": {"enabled": true, "template": "order_processing", "language": "en"},
    "order_shipped":    {"enabled": true, "template": "order_shipped",    "language": "en"},
    "order_delivered":  {"enabled": true, "template": "order_delivered",  "language": "en"},
    "order_cancelled":  {"enabled": true, "template": "order_cancelled",  "language": "en"}
  }'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.notification_settings (id) values (1);

create table public.notification_logs (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references public.orders (id) on delete cascade,
  phone               text not null check (phone ~ '^923[0-9]{9}$'),
  event               public.notification_event not null,
  channel             text not null default 'whatsapp',
  template_name       text not null,
  language            text not null default 'en',
  variables           jsonb not null default '[]'::jsonb,
  status              public.notification_status not null default 'pending',
  provider_message_id text unique,
  error               text,
  response            jsonb,
  attempts            integer not null default 0,
  last_attempt_at     timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- One notification per order per event: saving the same status twice never re-sends.
create unique index notification_logs_once_idx on public.notification_logs (order_id, event) where event <> 'test';
create index notification_logs_status_idx on public.notification_logs (status, created_at desc);
create index notification_logs_created_idx on public.notification_logs (created_at desc);

create trigger set_updated_at before update on public.notification_logs for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.notification_settings for each row execute function private.set_updated_at();
create trigger audit_admin_change after insert or update or delete on public.notification_settings
  for each row execute function private.audit_admin_change();

alter table public.notification_settings enable row level security;
alter table public.notification_logs enable row level security;

create policy "Admins read notification settings" on public.notification_settings
  for select to authenticated using ((select public.is_admin()));
create policy "Admins update notification settings" on public.notification_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins read notification logs" on public.notification_logs
  for select to authenticated using ((select public.is_admin()));

-- Queue a WhatsApp message when an order is placed or changes status (customer opted in,
-- notifications enabled, event enabled). Sending happens server-side from this queue.
create function private.enqueue_order_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.notification_event;
  v_settings public.notification_settings;
  v_cfg jsonb;
begin
  if not new.whatsapp_opt_in then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_event := 'order_placed';
  elsif new.status is distinct from old.status then
    v_event := case new.status
      when 'confirmed' then 'order_confirmed'
      when 'processing' then 'order_processing'
      when 'shipped' then 'order_shipped'
      when 'delivered' then 'order_delivered'
      when 'cancelled' then 'order_cancelled'
    end::public.notification_event;
  end if;
  if v_event is null then
    return null;
  end if;

  select * into v_settings from public.notification_settings where id = 1;
  if not found or not v_settings.enabled then
    return null;
  end if;
  v_cfg := v_settings.events -> v_event::text;
  if v_cfg is null or not coalesce((v_cfg ->> 'enabled')::boolean, false) then
    return null;
  end if;

  insert into public.notification_logs (order_id, phone, event, template_name, language, variables)
  values (
    new.id,
    '92' || substr(new.phone, 2),
    v_event,
    coalesce(nullif(v_cfg ->> 'template', ''), v_event::text),
    coalesce(nullif(v_cfg ->> 'language', ''), 'en'),
    case when v_event = 'order_shipped'
      then jsonb_build_array(new.order_number, coalesce(new.courier, 'our courier partner'), coalesce(new.tracking_number, 'shared on dispatch'))
      else jsonb_build_array(new.order_number)
    end
  )
  on conflict (order_id, event) where event <> 'test' do nothing;
  return null;
end;
$$;

create trigger enqueue_order_notification
  after insert or update of status on public.orders
  for each row execute function private.enqueue_order_notification();

-- Atomically hands queued messages to one sender (skip locked = no double sending).
-- Picks pending rows, failed rows with automatic retries left, and rows stuck in "sending".
create function public.claim_notifications(p_ids uuid[] default null, p_limit integer default 20, p_manual boolean default false)
returns setof public.notification_logs
language sql security definer set search_path = '' as $$
  update public.notification_logs n
     set status = 'sending', attempts = n.attempts + 1, last_attempt_at = now()
   where n.id in (
     select l.id from public.notification_logs l
      where (p_ids is null or l.id = any (p_ids))
        and (
          l.status = 'pending'
          or (l.status = 'failed' and (p_manual or l.attempts < 3))
          or (l.status = 'sending' and l.last_attempt_at < now() - interval '5 minutes')
        )
      order by l.created_at
      limit least(greatest(p_limit, 1), 50)
      for update skip locked
   )
  returning n.*;
$$;

------------------------------------------------------------------------------
-- Order lifecycle (replaces the stricter rules from the first migration)
--   active statuses can move to any other active status (admin corrections),
--   pending..shipped can be cancelled, shipped/delivered can be returned,
--   cancelled and returned are final. Stock is restored exactly once.
------------------------------------------------------------------------------

create or replace function private.on_order_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_active text[] := array['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status::text = any (v_active) and new.status::text = any (v_active)) or
    (old.status in ('pending', 'confirmed', 'processing', 'shipped') and new.status = 'cancelled') or
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
  elsif old.status = 'delivered' and new.status <> 'returned' then
    new.delivered_at := null;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, note, actor_id)
  values (new.id, old.status, new.status, nullif(current_setting('app.status_note', true), ''), (select auth.uid()));

  return new;
end;
$$;

-- The one admin entry point for status changes (dashboard "Update status").
create function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null,
  p_courier text default null,
  p_tracking_number text default null,
  p_tracking_url text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform set_config('app.status_note', coalesce(left(btrim(p_note), 500), ''), true);

  update public.orders o
     set status = p_status,
         courier = coalesce(nullif(btrim(p_courier), ''), o.courier),
         tracking_number = coalesce(nullif(btrim(p_tracking_number), ''), o.tracking_number),
         tracking_url = coalesce(nullif(btrim(p_tracking_url), ''), o.tracking_url)
   where o.id = p_order_id
  returning o.* into v_order;

  perform set_config('app.status_note', '', true);

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_order;
end;
$$;

------------------------------------------------------------------------------
-- Checkout: store open/closed switch and WhatsApp opt-in
------------------------------------------------------------------------------

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
    subtotal, discount_total, shipping_fee, total, coupon_id, coupon_code, payment_method, whatsapp_opt_in
  ) values (
    v_number, p_user_id,
    btrim(p_customer ->> 'full_name'), v_phone,
    nullif(lower(btrim(p_customer ->> 'email')), ''),
    btrim(p_customer ->> 'city'), btrim(p_customer ->> 'address_line'),
    nullif(btrim(p_customer ->> 'postal_code'), ''), nullif(btrim(p_customer ->> 'notes'), ''),
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon_id, v_coupon_code, p_payment_method,
    coalesce((p_customer ->> 'whatsapp_opt_in')::boolean, false)
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

-- Tracking now includes the delivery time and the step notes customers may see.
create or replace function public.track_order(p_order_number text, p_phone text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'created_at', o.created_at,
    'delivered_at', o.delivered_at,
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

------------------------------------------------------------------------------
-- Inventory: labelled admin adjustments
------------------------------------------------------------------------------

create or replace function private.log_stock_change() returns trigger
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
    insert into public.inventory_movements (variant_id, delta, reason, order_id, actor_id, note)
    values (
      new.id,
      v_delta,
      coalesce(
        nullif(current_setting('app.inventory_reason', true), ''),
        case when v_delta > 0 then 'restock' else 'adjustment' end
      )::public.inventory_reason,
      nullif(current_setting('app.inventory_order', true), '')::uuid,
      (select auth.uid()),
      nullif(current_setting('app.inventory_note', true), '')
    );
  end if;
  return null;
end;
$$;

-- p_mode 'set' replaces the stock count, 'add' adds (negative to remove).
create function public.admin_adjust_stock(p_variant_id uuid, p_mode text, p_quantity integer, p_note text default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_mode not in ('set', 'add') then
    raise exception 'INVALID_MODE' using errcode = 'P0001';
  end if;

  perform set_config('app.inventory_note', coalesce(left(btrim(p_note), 300), ''), true);
  update public.product_variants
     set stock = case p_mode when 'set' then p_quantity else stock + p_quantity end
   where id = p_variant_id
  returning stock into v_stock;
  perform set_config('app.inventory_note', '', true);

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_stock;
end;
$$;

------------------------------------------------------------------------------
-- Reporting (admin only). Money definitions used everywhere:
--   gross sales     = item subtotal of orders that were not cancelled
--   discounts       = coupon discounts on those orders
--   net revenue     = order totals with payment_status = 'paid' (money actually received)
--   refunds         = order totals with payment_status = 'refunded'
--   awaiting payment= non-cancelled orders not yet paid (e.g. COD in transit)
------------------------------------------------------------------------------

create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_month date := date_trunc('month', now() at time zone 'Asia/Karachi')::date;
  v_low integer := coalesce((select low_stock_threshold from public.store_settings where id = 1), 3);
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_orders', (select count(*) from public.orders),
    'today_orders', (select count(*) from public.orders where (created_at at time zone 'Asia/Karachi')::date = v_today),
    'status_counts', (
      select coalesce(jsonb_object_agg(s, c), '{}'::jsonb)
      from (select status::text s, count(*) c from public.orders group by status) x
    ),
    'net_revenue', (select coalesce(sum(total), 0) from public.orders where payment_status = 'paid'),
    'month_net_revenue', (
      select coalesce(sum(total), 0) from public.orders
      where payment_status = 'paid' and (created_at at time zone 'Asia/Karachi')::date >= v_month
    ),
    'gross_sales', (select coalesce(sum(subtotal), 0) from public.orders where status <> 'cancelled'),
    'month_gross_sales', (
      select coalesce(sum(subtotal), 0) from public.orders
      where status <> 'cancelled' and (created_at at time zone 'Asia/Karachi')::date >= v_month
    ),
    'awaiting_payment', (
      select coalesce(sum(total), 0) from public.orders
      where status not in ('cancelled', 'returned') and payment_status in ('pending', 'awaiting_verification')
    ),
    'total_customers', (
      select count(*) from (
        select phone as k from public.orders
        union
        select coalesce(p.phone, p.id::text) from public.profiles p where p.role = 'customer'
      ) c
    ),
    'total_products', (select count(*) from public.products),
    'active_products', (select count(*) from public.products where is_active),
    'low_stock_threshold', v_low,
    'low_stock', (select count(*) from public.product_variants where is_active and stock > 0 and stock <= v_low),
    'out_of_stock', (select count(*) from public.product_variants where is_active and stock = 0),
    'sales_by_day', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'gross', coalesce(r.gross, 0), 'orders', coalesce(r.orders, 0)) order by d.day)
      from (select (v_today - g)::date as day from generate_series(0, 29) g) d
      left join (
        select (created_at at time zone 'Asia/Karachi')::date as day,
               sum(subtotal) filter (where status <> 'cancelled') as gross,
               count(*) as orders
        from public.orders
        where created_at >= now() - interval '31 days'
        group by 1
      ) r on r.day = d.day
    ),
    'best_sellers', (
      select coalesce(jsonb_agg(b order by b.quantity desc), '[]'::jsonb) from (
        select i.product_name as name, i.product_slug as slug, sum(i.quantity)::integer as quantity, sum(i.line_total)::integer as revenue
        from public.order_items i join public.orders o on o.id = i.order_id
        where o.status not in ('cancelled', 'returned') and o.created_at >= now() - interval '90 days'
        group by 1, 2 order by 3 desc limit 5
      ) b
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) from (
        select id, order_number, customer_name, city, total, status, payment_status, payment_method, created_at
        from public.orders order by created_at desc limit 8
      ) r
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(a order by a.at desc), '[]'::jsonb) from (
        select h.created_at as at, o.id as order_id, o.order_number, o.customer_name, h.from_status, h.to_status, h.note,
               p.full_name as actor
        from public.order_status_history h
        join public.orders o on o.id = h.order_id
        left join public.profiles p on p.id = h.actor_id and p.role = 'admin'
        order by h.created_at desc limit 10
      ) a
    )
  );
end;
$$;

create function public.admin_sales_report(p_from date, p_to date, p_granularity text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_unit text := case when p_granularity in ('day', 'week', 'month', 'year') then p_granularity else 'day' end;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 3660 then
    raise exception 'INVALID_RANGE' using errcode = 'P0001';
  end if;

  return (
    with o as (
      select *, (created_at at time zone 'Asia/Karachi')::date as day
      from public.orders
      where (created_at at time zone 'Asia/Karachi')::date between p_from and p_to
    ),
    kept as (select * from o where status <> 'cancelled')
    select jsonb_build_object(
      'totals', jsonb_build_object(
        'orders', (select count(*) from o),
        'cancelled_orders', (select count(*) from o where status = 'cancelled'),
        'gross_sales', (select coalesce(sum(subtotal), 0) from kept),
        'discounts', (select coalesce(sum(discount_total), 0) from kept),
        'shipping', (select coalesce(sum(shipping_fee), 0) from kept),
        'refunds', (select coalesce(sum(total), 0) from o where payment_status = 'refunded'),
        'net_revenue', (select coalesce(sum(total), 0) from o where payment_status = 'paid'),
        'awaiting_payment', (select coalesce(sum(total), 0) from kept where status <> 'returned' and payment_status in ('pending', 'awaiting_verification')),
        'average_order_value', (select coalesce(round(avg(total))::integer, 0) from kept)
      ),
      'series', (
        select coalesce(jsonb_agg(s order by s.bucket), '[]'::jsonb) from (
          select date_trunc(v_unit, day)::date as bucket,
                 count(*) as orders,
                 coalesce(sum(subtotal) filter (where status <> 'cancelled'), 0) as gross,
                 coalesce(sum(total) filter (where payment_status = 'paid'), 0) as net
          from o group by 1
        ) s
      ),
      'status_distribution', (
        select coalesce(jsonb_object_agg(status, c), '{}'::jsonb)
        from (select status::text, count(*) c from o group by status) x
      ),
      'best_products', (
        select coalesce(jsonb_agg(b order by b.quantity desc), '[]'::jsonb) from (
          select i.product_name as name, i.product_slug as slug, sum(i.quantity)::integer as quantity, sum(i.line_total)::integer as revenue
          from public.order_items i join kept k on k.id = i.order_id
          where k.status <> 'returned'
          group by 1, 2 order by 3 desc limit 10
        ) b
      ),
      'best_categories', (
        select coalesce(jsonb_agg(c order by c.revenue desc), '[]'::jsonb) from (
          select coalesce(cat.name, 'Uncategorised') as name, sum(i.quantity)::integer as quantity, sum(i.line_total)::integer as revenue
          from public.order_items i
          join kept k on k.id = i.order_id
          left join public.products p on p.id = i.product_id
          left join public.categories cat on cat.id = p.category_id
          where k.status <> 'returned'
          group by 1 order by 3 desc limit 10
        ) c
      )
    )
  );
end;
$$;

-- Customers = everyone who ordered (grouped by phone, so guests count) plus registered
-- accounts that have not ordered yet.
create function public.admin_customers(p_search text default null, p_limit integer default 25, p_offset integer default 0)
returns table (
  customer_key text, name text, phone text, email text, registered boolean,
  orders_count bigint, total_spent bigint, last_order_at timestamptz, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  with by_phone as (
    select o.phone as customer_key,
           (array_agg(o.customer_name order by o.created_at desc))[1] as name,
           o.phone,
           (array_agg(o.email order by o.created_at desc) filter (where o.email is not null))[1] as email,
           bool_or(o.user_id is not null) as registered,
           count(*) as orders_count,
           coalesce(sum(o.total) filter (where o.status not in ('cancelled', 'returned')), 0)::bigint as total_spent,
           max(o.created_at) as last_order_at
    from public.orders o
    group by o.phone
  ),
  no_orders as (
    select p.id::text, p.full_name, p.phone, u.email::text, true, 0::bigint, 0::bigint, null::timestamptz
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'customer'
      and not exists (select 1 from public.orders o where o.user_id = p.id)
      and (p.phone is null or not exists (select 1 from by_phone b where b.phone = p.phone))
  ),
  everyone as (select * from by_phone union all select * from no_orders)
  select e.*, count(*) over () as total_count
  from everyone e
  where v_q is null
     or e.name ilike '%' || v_q || '%'
     or e.phone like '%' || regexp_replace(v_q, '[^0-9]', '', 'g') || '%' and regexp_replace(v_q, '[^0-9]', '', 'g') <> ''
     or e.email ilike '%' || v_q || '%'
  order by e.last_order_at desc nulls last, e.name
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

------------------------------------------------------------------------------
-- Permissions
------------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.claim_notifications(uuid[], integer, boolean) from public, anon, authenticated;
grant execute on function public.claim_notifications(uuid[], integer, boolean) to service_role;

revoke execute on function
  public.place_order(jsonb, jsonb, public.payment_method, text, uuid),
  public.track_order(text, text)
from public, anon, authenticated;
grant execute on function
  public.place_order(jsonb, jsonb, public.payment_method, text, uuid),
  public.track_order(text, text)
to service_role;

revoke execute on function
  public.admin_update_order_status(uuid, public.order_status, text, text, text, text),
  public.admin_adjust_stock(uuid, text, integer, text),
  public.admin_dashboard_stats(),
  public.admin_sales_report(date, date, text),
  public.admin_customers(text, integer, integer)
from public, anon;

------------------------------------------------------------------------------
-- Realtime: the admin orders list and signed-in customers' order pages update live.
-- Row level security still decides who receives which row.
------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.notification_logs;
  end if;
end;
$$;
