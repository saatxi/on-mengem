-- Enduriment després de la revisió de seguretat (octubre de 2026). Veure docs/SEGURETAT.md.
-- 1. Expulsar un membre canvia el codi d'invitació, perquè l'expulsat no pugui tornar a entrar amb l'antic.
--    El codi ja no es posa al missatge de l'alerta «Grup creat» (i s'esborra de les alertes existents).
-- 2. El nickname només es pot canviar un cop per minut: cada canvi reescriu el nom a tots els registres de
--    l'usuari (sync_nickname_to_records), i fer-ho en bucle carregava la BD i el Realtime dels seus grups.
-- 3. get_my_profile() retorna el perfil propi sencer. És el primer pas perquè els companys de grup deixin de veure
--    active_group_id i last_login_at: quan cap client instal·lat no llegeixi la taula amb select('*'), una migració
--    posterior en revocarà aquestes columnes (vegeu docs/MILLORES_PENDENTS.md).
-- 4. touch_updated_at fixa el search_path, com la resta de funcions.

-- ---------------------------------------------------------------- 1. Codi nou en expulsar

-- Només quan l'owner expulsa algú: sortir un mateix, esborrar el grup o esborrar el compte no hi entren
-- (en esborrar el grup, la fila de groups ja no hi és quan cauen els membres).
create or replace function public.regenerate_code_on_kick()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is distinct from auth.uid() and public.is_group_owner(old.group_id) then
    update public.groups set code = public.new_group_code() where id = old.group_id;
  end if;
  return old;
end $$;

create trigger group_members_regenerate_code after delete on public.group_members
  for each row execute function public.regenerate_code_on_kick();

-- Igual que a 0001_init.sql, però l'alerta ja no inclou el codi: els membres el veuen al grup mentre ho són,
-- i l'alerta es quedava amb un codi antic que algú podia reaprofitar.
create or replace function public.create_group(p_name text, p_description text default '')
returns public.groups language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  select coalesce(nickname, 'Gourmet') into nick from public.profiles where id = uid;

  insert into public.groups (name, description, code, owner_id, owner_name)
  values (left(trim(p_name), 80), left(coalesce(trim(p_description), ''), 300),
          public.new_group_code(), uid, nick)
  returning * into g;

  insert into public.group_members (group_id, user_id) values (g.id, uid);
  update public.profiles set active_group_id = g.id where id = uid;

  insert into public.alerts (group_id, user_id, type, title, message)
  values (g.id, uid, 'group_joined', 'Grup creat', nick || ' ha creat el grup "' || g.name || '".');
  return g;
end $$;

update public.alerts
   set message = regexp_replace(message, '\. Codi d''invitació: \S+$', '.')
 where type = 'group_joined' and title = 'Grup creat';

revoke all on function public.regenerate_code_on_kick() from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. Límit de canvis de nickname

alter table public.profiles add column nickname_changed_at timestamptz;

create or replace function public.quota_limit(p_name text)
returns int language plpgsql stable set search_path = '' as $$
begin
  return case p_name
    when 'personal_items' then 2000      -- restaurants, i a part desitjats, de l'espai personal d'un usuari
    when 'group_items' then 5000         -- restaurants, i a part desitjats, d'un grup
    when 'owned_groups' then 20          -- grups dels quals l'usuari és owner
    when 'restaurant_visits' then 500    -- visites d'un restaurant
    when 'group_alerts_per_hour' then 50 -- alertes que un usuari genera en un grup en una hora
    when 'nickname_interval_seconds' then 60 -- temps mínim entre dos canvis de nickname
  end;
end $$;

-- Desar el perfil amb el mateix nickname (p. ex. només canviant l'avatar) no compta com a canvi.
create or replace function public.throttle_nickname()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.nickname is not distinct from old.nickname then return new; end if;
  if old.nickname_changed_at > now() - make_interval(secs => public.quota_limit('nickname_interval_seconds')) then
    perform public.raise_quota_exceeded('Acabes de canviar el nom. Espera un minut per tornar-lo a canviar.');
  end if;
  new.nickname_changed_at := now();
  return new;
end $$;

create trigger profiles_throttle_nickname before update of nickname on public.profiles
  for each row execute function public.throttle_nickname();

revoke all on function public.throttle_nickname() from public, anon, authenticated;

-- ---------------------------------------------------------------- 3. Perfil propi

create or replace function public.get_my_profile()
returns setof public.profiles language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- ---------------------------------------------------------------- 4. search_path de touch_updated_at

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
