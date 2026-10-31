-- Homepage content managed from the admin: banner names, the 3D hanger section and its pieces,
-- and safe category deletion. Additive only: existing rows are untouched.

------------------------------------------------------------------------------
-- Banners: an internal name for the admin list (the heading is what customers see)
------------------------------------------------------------------------------

alter table public.banners add column if not exists title text check (char_length(title) <= 80);

------------------------------------------------------------------------------
-- 3D hanger ("signature rail") section
------------------------------------------------------------------------------

create table public.hanger_settings (
  id               smallint primary key default 1 check (id = 1),
  is_enabled       boolean not null default true,
  eyebrow          text not null default 'The Arsh Edit' check (char_length(eyebrow) <= 60),
  heading          text not null default 'Signature pieces, on the rail' check (char_length(heading) between 2 and 80),
  subtitle         text default 'Brush along the rail, slide a hanger aside, or lift a piece to turn it and see the detail.'
                   check (char_length(subtitle) <= 300),
  caption          text default 'Hover or tap a piece to turn it to the front.' check (char_length(caption) <= 200),
  cta_label        text not null default 'Shop the collection' check (char_length(cta_label) between 2 and 40),
  cta_href         text not null default '/shop' check (cta_href ~ '^(/[^/]|/$|https://)'),
  max_items        smallint not null default 8 check (max_items between 3 and 12),
  autoplay         boolean not null default true,
  interval_ms      integer not null default 3200 check (interval_ms between 2000 and 8000),
  featured_item_id uuid,
  updated_at       timestamptz not null default now()
);
insert into public.hanger_settings (id) values (1) on conflict do nothing;

-- One row per product on the rail. Products are referenced, never copied; a deleted product
-- simply leaves the rail. Images default to the product's own photos unless overridden here.
create table public.hanger_items (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null unique references public.products (id) on delete cascade,
  image_path      text check (char_length(image_path) <= 500),
  back_image_path text check (char_length(back_image_path) <= 500),
  title           text check (char_length(title) between 2 and 150),
  description     text check (char_length(description) <= 300),
  sort_order      integer not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint hanger_items_sort_unique unique (sort_order) deferrable initially deferred
);
create index hanger_items_active_sort_idx on public.hanger_items (sort_order) where is_active;

alter table public.hanger_settings
  add constraint hanger_settings_featured_fk foreign key (featured_item_id)
  references public.hanger_items (id) on delete set null;
create index hanger_settings_featured_idx on public.hanger_settings (featured_item_id);

create trigger set_updated_at before update on public.hanger_settings for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.hanger_items    for each row execute function private.set_updated_at();
create trigger audit_admin_change after insert or update or delete on public.hanger_settings
  for each row execute function private.audit_admin_change();
create trigger audit_admin_change after insert or update or delete on public.hanger_items
  for each row execute function private.audit_admin_change();

alter table public.hanger_settings enable row level security;
alter table public.hanger_items enable row level security;

create policy "Read hanger_settings" on public.hanger_settings
  for select to anon, authenticated using (true);
create policy "Admins update hanger_settings" on public.hanger_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Read hanger_items" on public.hanger_items
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Admins insert hanger_items" on public.hanger_items
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update hanger_items" on public.hanger_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete hanger_items" on public.hanger_items
  for delete to authenticated using ((select public.is_admin()));

-- Saves the whole hanger in one transaction: settings, the ordered list of pieces and the featured
-- piece. Pieces missing from p_items are removed. Runs with the caller's rights, so RLS applies too.
create function public.admin_save_hanger(p_settings jsonb, p_items jsonb)
returns void
language plpgsql set search_path = '' as $$
declare
  v_item     jsonb;
  v_pos      integer := 0;
  v_featured uuid;
  v_keep     uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 40 then
    raise exception 'INVALID_ITEMS' using errcode = 'P0001';
  end if;

  select coalesce(array_agg((e ->> 'product_id')::uuid), '{}') into v_keep from jsonb_array_elements(p_items) e;
  delete from public.hanger_items h where not (h.product_id = any (v_keep));

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;
    insert into public.hanger_items (product_id, image_path, back_image_path, title, description, sort_order, is_active)
    values (
      (v_item ->> 'product_id')::uuid,
      nullif(v_item ->> 'image_path', ''), nullif(v_item ->> 'back_image_path', ''),
      nullif(btrim(v_item ->> 'title'), ''), nullif(btrim(v_item ->> 'description'), ''),
      v_pos * 10, coalesce((v_item ->> 'is_active')::boolean, true)
    )
    on conflict (product_id) do update set
      image_path = excluded.image_path, back_image_path = excluded.back_image_path,
      title = excluded.title, description = excluded.description,
      sort_order = excluded.sort_order, is_active = excluded.is_active;
  end loop;

  select h.id into v_featured from public.hanger_items h
   where h.product_id = nullif(p_settings ->> 'featured_product_id', '')::uuid;

  update public.hanger_settings set
    is_enabled  = coalesce((p_settings ->> 'is_enabled')::boolean, is_enabled),
    eyebrow     = coalesce(p_settings ->> 'eyebrow', eyebrow),
    heading     = coalesce(p_settings ->> 'heading', heading),
    subtitle    = nullif(btrim(coalesce(p_settings ->> 'subtitle', subtitle)), ''),
    caption     = nullif(btrim(coalesce(p_settings ->> 'caption', caption)), ''),
    cta_label   = coalesce(p_settings ->> 'cta_label', cta_label),
    cta_href    = coalesce(p_settings ->> 'cta_href', cta_href),
    max_items   = coalesce((p_settings ->> 'max_items')::smallint, max_items),
    autoplay    = coalesce((p_settings ->> 'autoplay')::boolean, autoplay),
    interval_ms = coalesce((p_settings ->> 'interval_ms')::integer, interval_ms),
    featured_item_id = v_featured
  where id = 1;
end;
$$;

revoke execute on function public.admin_save_hanger(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_hanger(jsonb, jsonb) to authenticated;

------------------------------------------------------------------------------
-- Categories: delete safely, moving any products to another category first
------------------------------------------------------------------------------

create function public.admin_delete_category(p_id uuid, p_move_to uuid default null)
returns integer
language plpgsql set search_path = '' as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select count(*) into v_count from public.products where category_id = p_id;
  if v_count > 0 then
    if p_move_to is null then
      raise exception 'CATEGORY_NOT_EMPTY' using errcode = 'P0001';
    end if;
    if p_move_to = p_id or not exists (select 1 from public.categories where id = p_move_to) then
      raise exception 'INVALID_TARGET_CATEGORY' using errcode = 'P0001';
    end if;
    update public.products set category_id = p_move_to where category_id = p_id;
  end if;
  delete from public.categories where id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_count;
end;
$$;

revoke execute on function public.admin_delete_category(uuid, uuid) from public, anon;
grant execute on function public.admin_delete_category(uuid, uuid) to authenticated;
