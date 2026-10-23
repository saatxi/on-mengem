-- Quotes contra l'abús: un usuari autenticat no pot omplir la base de dades ni inundar un grup d'alertes.
-- Els triggers compten les files abans d'inserir i rebutgen l'operació amb l'errcode OMQ01 (l'app en mostra
-- el missatge). Un bloqueig consultiu per espai evita que dues insercions simultànies passin del límit.
-- Les dades existents que ja superin un límit es conserven; només es bloquegen les insercions noves.

-- Límits en un sol lloc. És plpgsql (no s'inclou dins dels plans) perquè els tests el puguin substituir.
create or replace function public.quota_limit(p_name text)
returns int language plpgsql stable set search_path = '' as $$
begin
  return case p_name
    when 'personal_items' then 2000      -- restaurants, i a part desitjats, de l'espai personal d'un usuari
    when 'group_items' then 5000         -- restaurants, i a part desitjats, d'un grup
    when 'owned_groups' then 20          -- grups dels quals l'usuari és owner
    when 'restaurant_visits' then 500    -- visites d'un restaurant
    when 'group_alerts_per_hour' then 50 -- alertes que un usuari genera en un grup en una hora
  end;
end $$;

create or replace function public.raise_quota_exceeded(p_message text)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_message using errcode = 'OMQ01';
end $$;

-- ---------------------------------------------------------------- Restaurants i desitjats

-- També en canviar group_id (move_to_group), perquè moure un ítem a un grup ple també l'ompliria.
create or replace function public.enforce_item_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  n int;
  max_rows int;
begin
  if tg_op = 'UPDATE' and new.group_id is not distinct from old.group_id then return new; end if;

  if tg_table_name = 'restaurants' then
    owner := new.created_by;
  else
    owner := new.user_id;
  end if;

  if new.group_id is null then
    max_rows := public.quota_limit('personal_items');
    perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':personal:' || coalesce(owner::text, ''), 0));
    if tg_table_name = 'restaurants' then
      select count(*) into n from public.restaurants where group_id is null and created_by = owner;
    else
      select count(*) into n from public.wishlist where group_id is null and user_id = owner;
    end if;
    if n >= max_rows then
      perform public.raise_quota_exceeded(format(
        'Has arribat al límit de %s %s a l''espai personal. Esborra''n algun per afegir-ne de nous.',
        max_rows, case when tg_table_name = 'restaurants' then 'restaurants' else 'desitjats' end));
    end if;
  else
    max_rows := public.quota_limit('group_items');
    perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':group:' || new.group_id::text, 0));
    if tg_table_name = 'restaurants' then
      select count(*) into n from public.restaurants where group_id = new.group_id;
    else
      select count(*) into n from public.wishlist where group_id = new.group_id;
    end if;
    if n >= max_rows then
      perform public.raise_quota_exceeded(format(
        'Aquest grup ha arribat al límit de %s %s. Esborreu-ne algun per afegir-ne de nous.',
        max_rows, case when tg_table_name = 'restaurants' then 'restaurants' else 'desitjats' end));
    end if;
  end if;
  return new;
end $$;

create trigger restaurants_quota before insert or update of group_id on public.restaurants
  for each row execute function public.enforce_item_quota();
create trigger wishlist_quota before insert or update of group_id on public.wishlist
  for each row execute function public.enforce_item_quota();

-- ---------------------------------------------------------------- Grups

-- Els grups només es creen amb create_group; compta els que l'usuari té com a owner.
create or replace function public.enforce_group_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
  max_rows int := public.quota_limit('owned_groups');
begin
  perform pg_advisory_xact_lock(hashtextextended('groups:' || new.owner_id::text, 0));
  select count(*) into n from public.groups where owner_id = new.owner_id;
  if n >= max_rows then
    perform public.raise_quota_exceeded(format(
      'Has arribat al límit de %s grups propis. Esborra''n o cedeix-ne algun per crear-ne un de nou.', max_rows));
  end if;
  return new;
end $$;

create trigger groups_quota before insert on public.groups
  for each row execute function public.enforce_group_quota();

-- ---------------------------------------------------------------- Visites

create or replace function public.enforce_visit_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
  max_rows int := public.quota_limit('restaurant_visits');
begin
  perform pg_advisory_xact_lock(hashtextextended('visits:' || new.restaurant_id::text, 0));
  select count(*) into n from public.restaurant_visits where restaurant_id = new.restaurant_id;
  if n >= max_rows then
    perform public.raise_quota_exceeded(format('Aquest restaurant ha arribat al límit de %s visites.', max_rows));
  end if;
  return new;
end $$;

create trigger restaurant_visits_quota before insert on public.restaurant_visits
  for each row execute function public.enforce_visit_quota();

-- ---------------------------------------------------------------- Alertes

-- Afegir i esborrar en bucle no topa amb les quotes de files, però sí que generaria alertes sense fi.
-- Passat el límit, l'alerta es descarta en silenci: l'acció que la provoca es fa igualment.
create or replace function public.throttle_alerts()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if new.user_id is null then return new; end if;
  select count(*) into n from public.alerts
   where group_id = new.group_id and user_id = new.user_id and created_at > now() - interval '1 hour';
  if n >= public.quota_limit('group_alerts_per_hour') then return null; end if;
  return new;
end $$;

create trigger alerts_throttle before insert on public.alerts
  for each row execute function public.throttle_alerts();

-- ---------------------------------------------------------------- Permisos

revoke all on function public.quota_limit(text) from public, anon, authenticated;
revoke all on function public.raise_quota_exceeded(text) from public, anon, authenticated;
revoke all on function public.enforce_item_quota() from public, anon, authenticated;
revoke all on function public.enforce_group_quota() from public, anon, authenticated;
revoke all on function public.enforce_visit_quota() from public, anon, authenticated;
revoke all on function public.throttle_alerts() from public, anon, authenticated;
