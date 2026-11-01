-- Admin allowlist: an account is linked automatically only after a real emailed confirmation.
-- With "Confirm email" turned off, Supabase marks new accounts confirmed without sending
-- anything, so whoever registered an authorised address first would become admin. Such
-- accounts (and accounts that change their email to an authorised one) now wait for the
-- owner to link them explicitly.

create or replace function private.link_admin_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Any email change away from the authorised address ends access.
  update public.admin_access
     set user_id = null, linked_at = null
   where user_id = new.id and email <> lower(coalesce(new.email, ''));

  -- Auto-link only a sign-up confirmed through the emailed link (not an email change,
  -- not an auto-confirmed account).
  if new.email_confirmed_at is not null
     and new.confirmation_sent_at is not null
     and new.email_confirmed_at >= new.confirmation_sent_at
     and (tg_op = 'INSERT' or old.email is not distinct from new.email) then
    update public.admin_access
       set user_id = new.id, linked_at = now()
     where email = lower(new.email) and user_id is null;
  end if;
  perform private.sync_admin_roles();
  return null;
end;
$$;

drop trigger on_auth_user_link_admin on auth.users;
create trigger on_auth_user_link_admin
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.link_admin_access();

/** Owner only: links the second admin's email to its existing, confirmed account. */
create function public.admin_link_second()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_user uuid;
begin
  if not private.is_owner() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select email into v_email from public.admin_access where slot = 2;
  if v_email is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select id into v_user from auth.users
   where lower(email) = v_email and email_confirmed_at is not null
   order by created_at limit 1;
  if v_user is null then
    raise exception 'NO_ACCOUNT' using errcode = 'P0001';
  end if;
  update public.admin_access set user_id = v_user, linked_at = now() where slot = 2;
  perform private.sync_admin_roles();
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, new_data)
  values ((select auth.uid()), 'update', 'admin_access', '2', jsonb_build_object('email', v_email, 'linked', true));
  return true;
end;
$$;

-- The list also says whether an account exists for a pending email, so the owner can link it.
drop function public.admin_access_list();
create function public.admin_access_list()
returns table (slot smallint, email text, is_owner boolean, linked boolean, account_exists boolean, linked_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
    select a.slot, a.email, a.slot = 1, a.user_id is not null,
           exists (select 1 from auth.users u where lower(u.email) = a.email and u.email_confirmed_at is not null),
           a.linked_at, a.created_at
    from public.admin_access a order by a.slot;
end;
$$;

revoke execute on function public.admin_access_list(), public.admin_link_second() from public, anon;
grant execute on function public.admin_access_list(), public.admin_link_second() to authenticated;
