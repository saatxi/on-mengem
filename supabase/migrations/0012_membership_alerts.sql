-- Alertes de canvis de membres: fins ara només es registrava qui entrava al grup.
-- 1. group_left: un membre surt del grup, l'owner l'expulsa o esborra el compte.
-- 2. owner_changed: l'owner cedeix el grup (transfer_group_ownership) o el grup passa a un altre membre
--    perquè l'owner ha esborrat el compte (handle_user_delete).
-- Esborrar el grup no genera alertes: el cascade s'endu les del grup.

alter table public.alerts drop constraint alerts_type_check;
alter table public.alerts add constraint alerts_type_check check (type in (
  'restaurant_added', 'wishlist_added', 'group_joined', 'restaurant_reviewed', 'group_left', 'owner_changed'
));

-- ---------------------------------------------------------------- 1. Sortides i expulsions

-- handle_user_delete marca l'usuari que s'està esborrant (fins al final de la transacció): les seves alertes
-- les crea aquella funció, mentre encara existeixen el perfil i l'usuari.
create or replace function public.is_deleting_user(p_user_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(current_setting('onmenjem.deleting_user', true), '') = p_user_id::text;
$$;

create or replace function public.notify_member_left()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  g_name text;
  member_name text;
  actor_name text;
begin
  -- En esborrar el grup, la fila de groups ja no hi és quan cauen els membres.
  select name into g_name from public.groups where id = old.group_id;
  if not found then return old; end if;
  if public.is_deleting_user(old.user_id) then return old; end if;

  select nickname into member_name from public.profiles where id = old.user_id;
  member_name := coalesce(member_name, 'Algú');

  if actor is not null and actor is distinct from old.user_id then
    select nickname into actor_name from public.profiles where id = actor;
    insert into public.alerts (group_id, user_id, type, title, message, read_by)
    values (old.group_id, actor, 'group_left', 'Membre expulsat',
            coalesce(actor_name, 'Algú') || ' ha expulsat ' || member_name || ' del grup "' || g_name || '".',
            array[actor]);
  else
    insert into public.alerts (group_id, user_id, type, title, message, read_by)
    values (old.group_id, old.user_id, 'group_left', 'Un membre ha sortit del grup',
            member_name || ' ha sortit del grup "' || g_name || '".',
            array[old.user_id]);
  end if;
  return old;
end $$;

create trigger group_members_notify_left after delete on public.group_members
  for each row execute function public.notify_member_left();

-- ---------------------------------------------------------------- 2. Canvi d'owner

create or replace function public.notify_owner_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_name text;
  msg text;
begin
  select nickname into old_name from public.profiles where id = old.owner_id;
  if public.is_deleting_user(old.owner_id) then
    msg := coalesce(new.owner_name, 'Algú') || ' és el nou creador del grup "' || new.name || '".';
  else
    msg := coalesce(old_name, 'Algú') || ' ha cedit el grup "' || new.name || '" a ' || coalesce(new.owner_name, 'un altre membre') || '.';
  end if;

  insert into public.alerts (group_id, user_id, type, title, message, read_by)
  values (new.id, old.owner_id, 'owner_changed', 'Nou creador del grup', msg, array[old.owner_id]);
  return new;
end $$;

create trigger groups_notify_owner_changed after update of owner_id on public.groups
  for each row when (old.owner_id is distinct from new.owner_id)
  execute function public.notify_owner_changed();

-- Igual que a 0001_init.sql, però marca l'usuari que s'esborra i avisa els grups on queda algú.
-- L'usuari i el perfil encara existeixen (trigger before delete); alerts.user_id passa a NULL pel cascade.
create or replace function public.handle_user_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  g record;
  heir uuid;
  heir_name text;
  nick text;
begin
  perform set_config('onmenjem.deleting_user', old.id::text, true);
  select nickname into nick from public.profiles where id = old.id;

  delete from public.restaurants where group_id is null and created_by = old.id;
  delete from public.wishlist where group_id is null and user_id = old.id;

  for g in select id from public.groups where owner_id = old.id loop
    heir := null;
    select m.user_id, p.nickname into heir, heir_name
      from public.group_members m left join public.profiles p on p.id = m.user_id
     where m.group_id = g.id and m.user_id <> old.id
     order by m.joined_at, m.user_id
     limit 1;
    if heir is not null then
      update public.groups set owner_id = heir, owner_name = heir_name where id = g.id;
    end if;
  end loop;

  -- Els grups sense cap altre membre cauen pel cascade: no cal avisar ningú.
  insert into public.alerts (group_id, user_id, type, title, message, read_by)
  select m.group_id, old.id, 'group_left', 'Un membre ha sortit del grup',
         coalesce(nick, 'Algú') || ' ha esborrat el compte i ja no és al grup "' || gr.name || '".',
         '{}'
    from public.group_members m
    join public.groups gr on gr.id = m.group_id
   where m.user_id = old.id
     and exists (select 1 from public.group_members o where o.group_id = m.group_id and o.user_id <> old.id);
  return old;
end $$;

revoke all on function public.is_deleting_user(uuid) from public, anon, authenticated;
revoke all on function public.notify_member_left() from public, anon, authenticated;
revoke all on function public.notify_owner_changed() from public, anon, authenticated;
