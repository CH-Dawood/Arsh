-- Saves a product, its images and its variants (size × colour × stock) in one transaction,
-- so the catalogue never shows a half-saved product. Admin only; every change is audited.

create function public.admin_save_product(p_product jsonb, p_images jsonb, p_variants jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p_product ->> 'id', '')::uuid;
  v_keep_images uuid[];
  v_keep_variants uuid[];
  r jsonb;
  i integer := 0;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(p_images) is distinct from 'array' or jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception 'INVALID_PAYLOAD' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_variants) = 0 then
    raise exception 'VARIANT_REQUIRED' using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.products (
      name, slug, short_description, description, fabric, embroidery, care_instructions, piece_count,
      category_id, brand_id, base_price, compare_at_price,
      is_new_arrival, is_best_seller, is_luxury, is_featured, is_active, seo_title, seo_description
    ) values (
      btrim(p_product ->> 'name'), p_product ->> 'slug',
      nullif(btrim(p_product ->> 'short_description'), ''), nullif(btrim(p_product ->> 'description'), ''),
      nullif(btrim(p_product ->> 'fabric'), ''), nullif(btrim(p_product ->> 'embroidery'), ''),
      nullif(btrim(p_product ->> 'care_instructions'), ''), nullif(p_product ->> 'piece_count', '')::smallint,
      (p_product ->> 'category_id')::uuid, nullif(p_product ->> 'brand_id', '')::uuid,
      (p_product ->> 'base_price')::integer, nullif(p_product ->> 'compare_at_price', '')::integer,
      coalesce((p_product ->> 'is_new_arrival')::boolean, false), coalesce((p_product ->> 'is_best_seller')::boolean, false),
      coalesce((p_product ->> 'is_luxury')::boolean, false), coalesce((p_product ->> 'is_featured')::boolean, false),
      coalesce((p_product ->> 'is_active')::boolean, true),
      nullif(btrim(p_product ->> 'seo_title'), ''), nullif(btrim(p_product ->> 'seo_description'), '')
    )
    returning id into v_id;
  else
    update public.products set
      name = btrim(p_product ->> 'name'),
      slug = p_product ->> 'slug',
      short_description = nullif(btrim(p_product ->> 'short_description'), ''),
      description = nullif(btrim(p_product ->> 'description'), ''),
      fabric = nullif(btrim(p_product ->> 'fabric'), ''),
      embroidery = nullif(btrim(p_product ->> 'embroidery'), ''),
      care_instructions = nullif(btrim(p_product ->> 'care_instructions'), ''),
      piece_count = nullif(p_product ->> 'piece_count', '')::smallint,
      category_id = (p_product ->> 'category_id')::uuid,
      brand_id = nullif(p_product ->> 'brand_id', '')::uuid,
      base_price = (p_product ->> 'base_price')::integer,
      compare_at_price = nullif(p_product ->> 'compare_at_price', '')::integer,
      is_new_arrival = coalesce((p_product ->> 'is_new_arrival')::boolean, false),
      is_best_seller = coalesce((p_product ->> 'is_best_seller')::boolean, false),
      is_luxury = coalesce((p_product ->> 'is_luxury')::boolean, false),
      is_featured = coalesce((p_product ->> 'is_featured')::boolean, false),
      is_active = coalesce((p_product ->> 'is_active')::boolean, true),
      seo_title = nullif(btrim(p_product ->> 'seo_title'), ''),
      seo_description = nullif(btrim(p_product ->> 'seo_description'), '')
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  -- Images: keep the given ones in the given order, remove the rest.
  v_keep_images := array(select (e ->> 'id')::uuid from jsonb_array_elements(p_images) e where nullif(e ->> 'id', '') is not null);
  delete from public.product_images where product_id = v_id and not (id = any (v_keep_images));
  for r in select * from jsonb_array_elements(p_images) loop
    if nullif(r ->> 'id', '') is null then
      insert into public.product_images (product_id, storage_path, alt, sort_order)
      values (v_id, r ->> 'storage_path', nullif(btrim(r ->> 'alt'), ''), i);
    else
      update public.product_images set alt = nullif(btrim(r ->> 'alt'), ''), sort_order = i
       where id = (r ->> 'id')::uuid and product_id = v_id;
    end if;
    i := i + 1;
  end loop;

  -- Variants: update existing (stock changes land in the ledger), add new, remove dropped ones.
  v_keep_variants := array(select (e ->> 'id')::uuid from jsonb_array_elements(p_variants) e where nullif(e ->> 'id', '') is not null);
  delete from public.product_variants where product_id = v_id and not (id = any (v_keep_variants));
  perform set_config('app.inventory_note', 'Product editor', true);
  for r in select * from jsonb_array_elements(p_variants) loop
    if nullif(r ->> 'id', '') is null then
      insert into public.product_variants (product_id, size_id, color_id, sku, stock, price_override, is_active)
      values (
        v_id, (r ->> 'size_id')::uuid, nullif(r ->> 'color_id', '')::uuid, btrim(r ->> 'sku'),
        coalesce((r ->> 'stock')::integer, 0), nullif(r ->> 'price_override', '')::integer,
        coalesce((r ->> 'is_active')::boolean, true)
      );
    else
      update public.product_variants set
        size_id = (r ->> 'size_id')::uuid,
        color_id = nullif(r ->> 'color_id', '')::uuid,
        sku = btrim(r ->> 'sku'),
        stock = coalesce((r ->> 'stock')::integer, 0),
        price_override = nullif(r ->> 'price_override', '')::integer,
        is_active = coalesce((r ->> 'is_active')::boolean, true)
      where id = (r ->> 'id')::uuid and product_id = v_id;
    end if;
  end loop;
  perform set_config('app.inventory_note', '', true);

  return v_id;
end;
$$;

revoke execute on function public.admin_save_product(jsonb, jsonb, jsonb) from public, anon;
