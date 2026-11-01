-- Brand/label management and a two-account admin allowlist. Additive: existing products,
-- brands and the current admin keep working.

------------------------------------------------------------------------------
-- Brands: never silently unassigned. Deleting goes through admin_delete_brand(), which
-- moves products to another brand (or clears the label) first, in one transaction.
------------------------------------------------------------------------------

alter table public.products drop constraint products_brand_id_fkey;
alter table public.products
  add constraint products_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete restrict;

create function public.admin_delete_brand(p_id uuid, p_move_to uuid default null, p_clear boolean default false)
returns integer
language plpgsql set search_path = '' as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select count(*) into v_count from public.products where brand_id = p_id;
  if v_count > 0 then
    if p_move_to is not null then
      if p_move_to = p_id or not exists (select 1 from public.brands where id = p_move_to) then
        raise exception 'INVALID_TARGET_BRAND' using errcode = 'P0001';
      end if;
      update public.products set brand_id = p_move_to where brand_id = p_id;
    elsif p_clear then
      update public.products set brand_id = null where brand_id = p_id;
    else
      raise exception 'BRAND_IN_USE' using errcode = 'P0001';
    end if;
  end if;
  delete from public.brands where id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_count;
end;
$$;

revoke execute on function public.admin_delete_brand(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_delete_brand(uuid, uuid, boolean) to authenticated;

------------------------------------------------------------------------------
-- Admin allowlist: at most two rows by construction (slot 1 = owner, slot 2 = second admin).
-- A row grants admin rights only once it is linked to the Supabase Auth account that has
-- confirmed that exact email. profiles.role is kept in sync for display but no longer grants
-- anything, and nobody can change it through the API.
------------------------------------------------------------------------------

create table public.admin_access (
  slot       smallint primary key check (slot in (1, 2)),
  email      text not null unique check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  user_id    uuid unique references auth.users (id) on delete set null,
  added_by   uuid references auth.users (id) on delete set null,
  linked_at  timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_access enable row level security;
revoke all on public.admin_access from anon, authenticated;
grant select on public.admin_access to authenticated;
-- Admins may read the list; there are no write policies: changes go through the functions below.
create policy "Admins read admin access" on public.admin_access
  for select to authenticated using ((select public.is_admin()));

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.admin_access a
    join auth.users u on u.id = a.user_id
    where a.user_id = (select auth.uid())
      and lower(u.email) = a.email
      and u.email_confirmed_at is not null
  );
$$;

-- Keeps profiles.role equal to the allowlist (display and customer counts use it).
create function private.sync_admin_roles() returns void
language sql security definer set search_path = '' as $$
  update public.profiles p
     set role = case when exists (select 1 from public.admin_access a where a.user_id = p.id)
                     then 'admin'::public.user_role else 'customer'::public.user_role end
   where p.role is distinct from case when exists (select 1 from public.admin_access a where a.user_id = p.id)
                                      then 'admin'::public.user_role else 'customer'::public.user_role end;
$$;

-- Links an allowlisted email to its account once the email is confirmed; unlinks if the
-- account's email changes to something else.
create function private.link_admin_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.admin_access
     set user_id = null, linked_at = null
   where user_id = new.id and email <> lower(coalesce(new.email, ''));
  if new.email_confirmed_at is not null then
    update public.admin_access
       set user_id = new.id, linked_at = now()
     where email = lower(new.email) and user_id is null;
  end if;
  perform private.sync_admin_roles();
  return null;
end;
$$;

-- Named to fire after on_auth_user_created, so the new profile exists when roles are synced.
create trigger on_auth_user_link_admin
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.link_admin_access();

-- Role is derived from the allowlist: API callers (customers and admins alike) can't change it.
create or replace function private.guard_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Existing admins carry over: the earliest becomes the owner, the next (if any) the second admin.
-- Any further admin rows are demoted, since the store allows two.
insert into public.admin_access (slot, email, user_id, linked_at)
select row_number() over (order by u.created_at, u.id), lower(u.email), u.id, now()
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin' and u.email is not null
order by u.created_at, u.id
limit 2;

select private.sync_admin_roles();

create function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() and exists (
    select 1 from public.admin_access where slot = 1 and user_id = (select auth.uid())
  );
$$;

/** Both admins can see who has access (the second admin's email and whether it is linked). */
create function public.admin_access_list()
returns table (slot smallint, email text, is_owner boolean, linked boolean, linked_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select a.slot, a.email, a.slot = 1, a.user_id is not null, a.linked_at, a.created_at
    from public.admin_access a order by a.slot;
end;
$$;

/** Owner only: authorises the second admin's email. Fails if a second admin already exists. */
create function public.admin_grant_second(p_email text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
begin
  if not private.is_owner() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.admin_access where email = v_email) then
    raise exception 'ALREADY_ADMIN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.admin_access where slot = 2) then
    raise exception 'ADMIN_LIMIT' using errcode = 'P0001';
  end if;

  select id into v_user from auth.users
   where lower(email) = v_email and email_confirmed_at is not null
   order by created_at limit 1;

  insert into public.admin_access (slot, email, user_id, added_by, linked_at)
  values (2, v_email, v_user, (select auth.uid()), case when v_user is not null then now() end);
  perform private.sync_admin_roles();
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, new_data)
  values ((select auth.uid()), 'insert', 'admin_access', '2', jsonb_build_object('email', v_email, 'linked', v_user is not null));
  return v_user is not null;
end;
$$;

/** Owner only: removes the second admin (their account stays, as a customer). */
create function public.admin_revoke_second()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
begin
  if not private.is_owner() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.admin_access where slot = 2 returning email into v_email;
  if v_email is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.sync_admin_roles();
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, old_data)
  values ((select auth.uid()), 'delete', 'admin_access', '2', jsonb_build_object('email', v_email));
end;
$$;

revoke execute on function private.is_owner(), private.sync_admin_roles() from public, anon, authenticated;
revoke execute on function public.admin_access_list(), public.admin_grant_second(text), public.admin_revoke_second() from public, anon;
grant execute on function public.admin_access_list(), public.admin_grant_second(text), public.admin_revoke_second() to authenticated;
