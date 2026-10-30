-- Carts, wishlists, coupons, orders, payments, reviews and operational tables.

-- Signed-in carts only; guest carts live in the browser and are priced on the server.
create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity   integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant_id)
);
create index cart_items_variant_idx on public.cart_items (variant_id);

create table public.wishlists (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_idx on public.wishlists (product_id);

create table public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null check (code ~ '^[A-Za-z0-9_-]{3,30}$'),
  description        text check (char_length(description) <= 200),
  discount_type      public.discount_type not null,
  value              integer not null check (value > 0),
  max_discount       integer check (max_discount > 0),
  min_order_amount   integer not null default 0 check (min_order_amount >= 0),
  starts_at          timestamptz,
  expires_at         timestamptz check (expires_at is null or starts_at is null or expires_at > starts_at),
  usage_limit        integer check (usage_limit > 0),
  per_customer_limit integer check (per_customer_limit > 0),
  times_used         integer not null default 0 check (times_used >= 0),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100)
);
create unique index coupons_code_ci_idx on public.coupons (lower(code));

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique,
  user_id         uuid references public.profiles (id) on delete set null,
  customer_name   text not null check (char_length(customer_name) between 2 and 120),
  phone           text not null check (phone ~ '^03[0-9]{9}$'),
  email           text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  city            text not null check (char_length(city) between 2 and 80),
  address_line    text not null check (char_length(address_line) between 5 and 300),
  postal_code     text check (postal_code ~ '^[0-9]{5}$'),
  notes           text check (char_length(notes) <= 500),
  subtotal        integer not null check (subtotal >= 0),
  discount_total  integer not null default 0 check (discount_total >= 0),
  shipping_fee    integer not null default 0 check (shipping_fee >= 0),
  total           integer not null check (total >= 0),
  coupon_id       uuid references public.coupons (id) on delete set null,
  coupon_code     text,
  status          public.order_status not null default 'pending',
  payment_method  public.payment_method not null,
  payment_status  public.payment_status not null default 'pending',
  courier         text check (char_length(courier) <= 60),
  tracking_number text check (char_length(tracking_number) <= 80),
  tracking_url    text check (tracking_url ~ '^https://'),
  cancel_reason   text check (char_length(cancel_reason) <= 300),
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (total = subtotal - discount_total + shipping_fee)
);
create index orders_user_idx     on public.orders (user_id, created_at desc);
create index orders_status_idx   on public.orders (status, created_at desc);
create index orders_created_idx  on public.orders (created_at desc);
create index orders_phone_idx    on public.orders (phone);

-- Price and naming snapshot at purchase time; later catalogue edits never change history.
create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  product_slug  text not null,
  variant_label text not null,
  sku           text not null,
  image_path    text,
  unit_price    integer not null check (unit_price > 0),
  quantity      integer not null check (quantity between 1 and 10),
  line_total    integer generated always as (unit_price * quantity) stored,
  created_at    timestamptz not null default now()
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  note        text check (char_length(note) <= 500),
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons (id) on delete cascade,
  order_id   uuid not null unique references public.orders (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  phone      text not null,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, phone);

create table public.inventory_movements (
  id         bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta      integer not null check (delta <> 0),
  reason     public.inventory_reason not null,
  order_id   uuid references public.orders (id) on delete set null,
  actor_id   uuid references public.profiles (id) on delete set null,
  note       text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);

-- One row per payment attempt; (provider, provider_ref) makes gateway callbacks idempotent.
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  method       public.payment_method not null,
  provider_ref text,
  amount       integer not null check (amount >= 0),
  status       public.payment_status not null default 'pending',
  receipt_path text,
  payload      jsonb,
  verified_by  uuid references public.profiles (id) on delete set null,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (method, provider_ref)
);
create index payments_order_idx on public.payments (order_id);

create table public.returns (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete set null,
  reason        text not null check (char_length(reason) between 5 and 1000),
  status        public.return_status not null default 'requested',
  refund_amount integer check (refund_amount >= 0),
  admin_note    text check (char_length(admin_note) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index returns_order_idx on public.returns (order_id);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  title       text check (char_length(title) <= 120),
  body        text check (char_length(body) <= 2000),
  is_approved boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_approved_idx on public.reviews (product_id, created_at desc) where is_approved;

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  status     text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source     text check (char_length(source) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index newsletter_email_ci_idx on public.newsletter_subscribers (lower(email));

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone      text check (char_length(phone) <= 30),
  subject    text check (char_length(subject) <= 150),
  message    text not null check (char_length(message) between 10 and 3000),
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_open_idx on public.contact_messages (created_at desc) where not is_handled;

create table public.admin_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_entity_idx  on public.admin_audit_log (entity, entity_id);

create table private.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 1
);

create trigger set_updated_at before update on public.cart_items             for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.coupons                for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.orders                 for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.payments               for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.returns                for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.reviews                for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.newsletter_subscribers for each row execute function private.set_updated_at();
