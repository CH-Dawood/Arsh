-- Users, catalogue and storefront content.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text check (char_length(full_name) <= 120),
  phone      text check (phone is null or phone ~ '^03[0-9]{9}$'),
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  label        text check (char_length(label) <= 40),
  full_name    text not null check (char_length(full_name) between 2 and 120),
  phone        text not null check (phone ~ '^03[0-9]{9}$'),
  city         text not null check (char_length(city) between 2 and 80),
  address_line text not null check (char_length(address_line) between 5 and 300),
  postal_code  text check (postal_code ~ '^[0-9]{5}$'),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 80),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description     text check (char_length(description) <= 1000),
  image_path      text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  seo_title       text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index categories_active_sort_idx on public.categories (sort_order) where is_active;

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 1000),
  logo_path   text,
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index brands_active_sort_idx on public.brands (sort_order) where is_active;

create table public.sizes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (char_length(code) between 1 and 20),
  label      text not null check (char_length(label) between 1 and 40),
  sort_order integer not null default 0
);

create table public.colors (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  hex  text check (hex ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 150),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text check (char_length(short_description) <= 300),
  description       text check (char_length(description) <= 5000),
  fabric            text check (char_length(fabric) <= 300),
  embroidery        text check (char_length(embroidery) <= 500),
  care_instructions text check (char_length(care_instructions) <= 1000),
  piece_count       smallint check (piece_count between 1 and 3),
  category_id       uuid not null references public.categories (id) on delete restrict,
  brand_id          uuid references public.brands (id) on delete set null,
  base_price        integer not null check (base_price > 0),
  compare_at_price  integer check (compare_at_price > base_price),
  is_new_arrival    boolean not null default false,
  is_best_seller    boolean not null default false,
  is_luxury         boolean not null default false,
  is_active         boolean not null default true,
  seo_title         text check (char_length(seo_title) <= 70),
  seo_description   text check (char_length(seo_description) <= 170),
  search_vector     tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(fabric, '') || ' ' || coalesce(embroidery, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(short_description, '') || ' ' || coalesce(description, '')), 'C')
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx     on public.products (category_id);
create index products_brand_idx        on public.products (brand_id);
create index products_active_new_idx   on public.products (created_at desc) where is_active;
create index products_new_arrival_idx  on public.products (created_at desc) where is_active and is_new_arrival;
create index products_best_seller_idx  on public.products (created_at desc) where is_active and is_best_seller;
create index products_luxury_idx       on public.products (created_at desc) where is_active and is_luxury;
create index products_search_idx       on public.products using gin (search_vector);
create index products_name_trgm_idx    on public.products using gin (name extensions.gin_trgm_ops);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt          text check (char_length(alt) <= 200),
  color_id     uuid references public.colors (id) on delete set null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Inventory lives on variants: one row per product × size × colour.
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  size_id        uuid not null references public.sizes (id) on delete restrict,
  color_id       uuid references public.colors (id) on delete restrict,
  sku            text not null unique check (char_length(sku) between 2 and 64),
  stock          integer not null default 0 check (stock >= 0),
  price_override integer check (price_override > 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique nulls not distinct (product_id, size_id, color_id)
);
create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_low_stock_idx on public.product_variants (stock) where is_active;

create table public.home_sections (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind        public.home_section_kind not null,
  category_id uuid references public.categories (id) on delete cascade,
  image_path  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((kind = 'category') = (category_id is not null))
);

create table public.banners (
  id                uuid primary key default gen_random_uuid(),
  heading           text not null check (char_length(heading) between 2 and 80),
  subheading        text check (char_length(subheading) <= 200),
  promo_text        text check (char_length(promo_text) <= 80),
  cta_label         text check (char_length(cta_label) <= 30),
  cta_href          text check (cta_href ~ '^(/[^/]|/$|https://)'),
  image_path        text not null,
  mobile_image_path text,
  alt               text not null check (char_length(alt) between 2 and 200),
  sort_order        integer not null default 0,
  is_active         boolean not null default true,
  starts_at         timestamptz,
  ends_at           timestamptz check (ends_at is null or starts_at is null or ends_at > starts_at),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index banners_active_sort_idx on public.banners (sort_order) where is_active;

create table public.store_settings (
  id                      smallint primary key default 1 check (id = 1),
  store_name              text not null default 'Atelier' check (char_length(store_name) between 1 and 60),
  tagline                 text check (char_length(tagline) <= 120),
  logo_path               text,
  contact_email           text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone           text check (char_length(contact_phone) <= 30),
  address                 text check (char_length(address) <= 300),
  whatsapp_number         text check (whatsapp_number ~ '^[1-9][0-9]{9,14}$'),
  whatsapp_message        text check (char_length(whatsapp_message) <= 300),
  instagram_url           text check (instagram_url ~ '^https://'),
  tiktok_url              text check (tiktok_url ~ '^https://'),
  facebook_url            text check (facebook_url ~ '^https://'),
  free_shipping_threshold integer not null default 12000 check (free_shipping_threshold >= 0),
  shipping_fee            integer not null default 250 check (shipping_fee >= 0),
  cod_enabled             boolean not null default true,
  bank_transfer_enabled   boolean not null default false,
  bank_name               text check (char_length(bank_name) <= 80),
  bank_account_title      text check (char_length(bank_account_title) <= 120),
  bank_account_number     text check (char_length(bank_account_number) <= 40),
  bank_iban               text check (bank_iban ~ '^PK[0-9]{2}[A-Z]{4}[0-9A-Z]{16}$'),
  updated_at              timestamptz not null default now(),
  check (not bank_transfer_enabled or (bank_name is not null and bank_account_title is not null and bank_account_number is not null))
);

-- Editable long-form pages: about, policies, size guide, terms.
create table public.content_pages (
  slug            text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (char_length(title) between 2 and 120),
  body            text not null default '' check (char_length(body) <= 50000),
  seo_description text check (char_length(seo_description) <= 170),
  updated_at      timestamptz not null default now()
);

create table public.faq_items (
  id         uuid primary key default gen_random_uuid(),
  question   text not null check (char_length(question) between 5 and 300),
  answer     text not null check (char_length(answer) between 2 and 3000),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.profiles         for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.addresses        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.categories       for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.brands           for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.products         for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_variants for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.home_sections    for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.banners          for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.store_settings   for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.content_pages    for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.faq_items        for each row execute function private.set_updated_at();
