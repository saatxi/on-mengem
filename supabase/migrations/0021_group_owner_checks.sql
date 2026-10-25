-- Canvis d'owner més estrictes (revisió de seguretat d'octubre de 2026):
-- 1. transfer_group_ownership aplica la quota owned_groups al nou owner. enforce_group_quota només salta en crear
--    un grup, i es podia cedir un grup a algú que ja en tenia el màxim sense el seu consentiment.
-- 2. El grup no pot quedar amb un owner que no n'és membre. transfer_group_ownership i handle_user_delete
--    comprovaven la pertinença del nou owner sense bloquejar res: si sortia del grup al mateix moment, en quedava
--    com a owner sense ser-ne membre. Ara bloquegen la fila del grup abans de triar-lo, i protect_group_owner
--    bloqueja la mateixa fila en treure un membre i no deixa treure l'owner. Un for share a group_members no
--    n'hi hauria prou: una sortida que ja ha llegit la fila no torna a comprovar res en acabar d'esperar.

-- ---------------------------------------------------------------- Treure un membre

-- members_delete ja no deixa sortir l'owner, però avalua is_group_owner abans d'esperar el bloqueig de la fila.
-- Aquest trigger el torna a comprovar amb la fila del grup bloquejada, que és la que modifiquen les cessions.
-- En esborrar el grup, la fila de groups ja no hi és quan cauen els membres; en esborrar el compte d'un owner que
-- no deixa hereu, el grup cau amb ell (handle_user_delete marca l'usuari amb is_deleting_user).
create or replace function public.protect_group_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.groups where id = old.group_id for share;
  if owner = old.user_id and not public.is_deleting_user(old.user_id) then
    raise exception 'L''owner no pot sortir del grup: cedeix-lo o esborra''l';
  end if;
  return old;
end $$;

revoke all on function public.protect_group_owner() from public, anon, authenticated;

create trigger group_members_protect_owner before delete on public.group_members
  for each row execute function public.protect_group_owner();

-- ---------------------------------------------------------------- Cedir el grup

-- Igual que a 0001_init.sql, més el bloqueig del grup i la quota del nou owner.
create or replace function public.transfer_group_ownership(p_group_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  new_name text;
  owned int;
  max_groups int := public.quota_limit('owned_groups');
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  -- Les sortides i expulsions d'aquest grup esperen fins al final (protect_group_owner).
  perform 1 from public.groups where id = p_group_id for update;
  if not public.is_group_owner(p_group_id) then raise exception 'Només l''owner pot cedir el grup'; end if;
  if p_new_owner = auth.uid() or not exists (
    select 1 from public.group_members where group_id = p_group_id and user_id = p_new_owner
  ) then
    raise exception 'El nou owner ha de ser un altre membre del grup';
  end if;

  -- Mateix bloqueig que enforce_group_quota: una creació de grup simultània no passa del límit.
  perform pg_advisory_xact_lock(hashtextextended('groups:' || p_new_owner::text, 0));
  select count(*) into owned from public.groups where owner_id = p_new_owner;
  if owned >= max_groups then
    perform public.raise_quota_exceeded(format(
      'Aquest membre ja té %s grups propis i no en pot rebre cap més.', max_groups));
  end if;

  select nickname into new_name from public.profiles where id = p_new_owner;
  update public.groups set owner_id = p_new_owner, owner_name = new_name where id = p_group_id;
end $$;

-- ---------------------------------------------------------------- Esborrar el compte

-- Igual que a 0012_membership_alerts.sql, però bloqueja cada grup abans de triar-ne l'hereu. L'hereu no passa per la
-- quota: esborrar el compte no pot fallar perquè el membre més antic ja tingui el màxim de grups.
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

  for g in select id from public.groups where owner_id = old.id for update loop
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
