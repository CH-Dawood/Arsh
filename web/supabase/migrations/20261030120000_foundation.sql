-- Foundation: extensions, private schema, enums, shared helpers.

create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live here; this schema is not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.user_role         as enum ('customer', 'admin');
create type public.order_status      as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_status    as enum ('pending', 'awaiting_verification', 'paid', 'failed', 'refunded');
create type public.payment_method    as enum ('cod', 'bank_transfer', 'easypaisa', 'jazzcash', 'card');
create type public.discount_type     as enum ('percent', 'fixed');
create type public.home_section_kind as enum ('new_arrivals', 'luxury', 'best_sellers', 'brands', 'category');
create type public.inventory_reason  as enum ('order', 'cancel', 'return', 'restock', 'adjustment');
create type public.return_status     as enum ('requested', 'approved', 'rejected', 'received', 'refunded');

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalises Pakistani mobile numbers to 03XXXXXXXXX; returns null when invalid.
create function public.normalize_pk_phone(p_phone text) returns text
language sql immutable set search_path = '' as $$
  select case
    when d ~ '^03[0-9]{9}$'   then d
    when d ~ '^923[0-9]{9}$'  then '0' || substr(d, 3)
    when d ~ '^3[0-9]{9}$'    then '0' || d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as d) s;
$$;
