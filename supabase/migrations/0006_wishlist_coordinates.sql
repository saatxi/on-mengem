-- Coordenades als desitjats, com als restaurants: el formulari en busca l'adreça i en deixa ajustar el punt, i la
-- pestanya de desitjats els mostra en un mapa. Es conserven en copiar-los a un grup i en convertir-los en restaurant
-- (abans, el restaurant nou es geocodificava des de zero), i l'historial les tracta com les d'un restaurant.

alter table public.wishlist
  add column lat double precision,
  add column lng double precision,
  add constraint wishlist_coordinates_pair check (((lat is null) = (lng is null))),
  add constraint wishlist_lat_check check (((lat >= ('-90'::integer)::double precision) and (lat <= (90)::double precision))),
  add constraint wishlist_lng_check check (((lng >= ('-180'::integer)::double precision) and (lng <= (180)::double precision)));

comment on column public.wishlist.lat is 'Latitud de l''adreça (vista de mapa); totes dues coordenades o cap.';
comment on column public.wishlist.lng is 'Longitud de l''adreça (vista de mapa); totes dues coordenades o cap.';

-- ---------------------------------------------------------------- Historial

-- Mateix cos que a 0005, amb les coordenades també per als desitjats.
create or replace function public.record_group_change(p_group_id uuid, p_item_type text, p_item_id uuid, p_item_name text,
                                                      p_action text, p_before jsonb, p_after jsonb default null::jsonb)
    returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  uid uuid := auth.uid();
  nick text;
  before_data jsonb := p_before;
  after_data jsonb;
begin
  if p_action = 'update' then
    select jsonb_object_agg(f, p_before -> f), jsonb_object_agg(f, p_after -> f)
      into before_data, after_data
      from unnest(public.history_fields(p_item_type)) as f
     where nullif(p_before ->> f, '') is distinct from nullif(p_after ->> f, '');
    -- Coordenades d'un restaurant o un desitjat: amb un canvi d'adreça (desfer-lo torna el punt al lloc) o quan es
    -- mou un punt que ja hi era. coalesce: quan només s'ha mogut el punt, cap camp de history_fields ha canviat.
    if p_item_type in ('restaurant', 'wishlist')
       and (coalesce(before_data ? 'address', false)
            or (jsonb_typeof(p_before -> 'lat') = 'number'
                and (p_before -> 'lat', p_before -> 'lng') is distinct from (p_after -> 'lat', p_after -> 'lng'))) then
      before_data := coalesce(before_data, '{}'::jsonb) || jsonb_build_object('lat', p_before -> 'lat', 'lng', p_before -> 'lng');
      after_data := coalesce(after_data, '{}'::jsonb) || jsonb_build_object('lat', p_after -> 'lat', 'lng', p_after -> 'lng');
    end if;
    if before_data is null then return; end if;
  end if;

  select nickname into nick from public.profiles where id = uid;
  insert into public.group_changes (group_id, item_type, item_id, item_name, action, old_data, new_data,
                                    changed_by, changed_by_name)
  values (p_group_id, p_item_type, p_item_id, p_item_name, p_action, before_data, after_data, uid, nick);

  delete from public.group_changes
   where group_id = p_group_id
     and (created_at < now() - interval '90 days'
          or id in (select id from public.group_changes where group_id = p_group_id
                     order by created_at desc, id offset public.quota_limit('group_changes')));
end $$;

-- Mateix cos que a 0001, amb lat i lng en desfer l'edició d'un desitjat. Recuperar-ne un d'esborrat ja les inclou
-- (insereix la fila sencera).
create or replace function public.restore_group_change(p_change_id uuid)
    returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  uid uuid := auth.uid();
  c public.group_changes;
  r public.restaurants;
  w public.wishlist;
  v public.restaurant_visits;
  visit jsonb;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  select * into c from public.group_changes where id = p_change_id for update;
  if not found or not public.is_group_member(c.group_id) then raise exception 'Canvi no trobat'; end if;
  if c.restored_at is not null then raise exception 'Aquest canvi ja s''ha desfet'; end if;

  if c.item_type = 'restaurant' and c.action = 'update' then
    select * into r from public.restaurants where id = c.item_id and group_id = c.group_id for update;
    if not found then raise exception 'Aquest restaurant ja no existeix. Recupera''l primer.'; end if;
    r := jsonb_populate_record(r, c.old_data);
    update public.restaurants
       set name = r.name, cuisine = r.cuisine, price_range = r.price_range, address = r.address, lat = r.lat,
           lng = r.lng, rating = r.rating, notes = r.notes, link = r.link, instagram = r.instagram,
           favorite = r.favorite
     where id = r.id;

  elsif c.item_type = 'restaurant' then
    if exists (select 1 from public.restaurants where id = c.item_id) then
      raise exception 'Aquest restaurant ja s''ha recuperat';
    end if;
    r := jsonb_populate_record(null::public.restaurants, c.old_data);
    if not exists (select 1 from auth.users where id = r.created_by) then r.created_by := null; end if;
    insert into public.restaurants values (r.*);
    for visit in select value from jsonb_array_elements(coalesce(c.old_data -> 'visits', '[]'::jsonb)) loop
      perform public.restore_visit_snapshot(visit);
    end loop;

  elsif c.item_type = 'wishlist' and c.action = 'update' then
    select * into w from public.wishlist where id = c.item_id and group_id = c.group_id for update;
    if not found then raise exception 'Aquest desitjat ja no existeix. Recupera''l primer.'; end if;
    w := jsonb_populate_record(w, c.old_data);
    update public.wishlist
       set restaurant_name = w.restaurant_name, cuisine = w.cuisine, price_range = w.price_range,
           recommended_by = w.recommended_by, address = w.address, notes = w.notes, link = w.link,
           instagram = w.instagram, status = w.status, lat = w.lat, lng = w.lng
     where id = w.id;

  elsif c.item_type = 'wishlist' then
    if exists (select 1 from public.wishlist where id = c.item_id) then
      raise exception 'Aquest desitjat ja s''ha recuperat';
    end if;
    w := jsonb_populate_record(null::public.wishlist, c.old_data);
    if not exists (select 1 from auth.users where id = w.user_id) then w.user_id := null; end if;
    insert into public.wishlist values (w.*);

  elsif c.action = 'update' then
    if not exists (select 1 from public.restaurant_visits where id = c.item_id and group_id = c.group_id) then
      raise exception 'Aquesta visita ja no existeix. Recupera-la primer.';
    end if;
    if not public.can_edit_visit(c.item_id) then raise exception 'No pots editar aquesta visita'; end if;
    select * into v from public.restaurant_visits where id = c.item_id for update;
    v := jsonb_populate_record(v, c.old_data - 'attendees');
    -- La pròpia edició (save_visit) la registra a l'historial i hi aplica les comprovacions d'assistents.
    perform public.save_visit(
      v.restaurant_id, v.visited_on, v.rating, coalesce(v.notes, ''),
      case when c.old_data ? 'attendees'
           then array(select a.user_id::uuid from jsonb_array_elements_text(c.old_data -> 'attendees') as a(user_id)
                       where exists (select 1 from public.group_members m
                                      where m.group_id = c.group_id and m.user_id = a.user_id::uuid))
           else array(select a.user_id from public.visit_attendees a where a.visit_id = v.id) end,
      v.shared, v.id);

  else
    if exists (select 1 from public.restaurant_visits where id = c.item_id) then
      raise exception 'Aquesta visita ja s''ha recuperat';
    end if;
    v := jsonb_populate_record(null::public.restaurant_visits, c.old_data);
    if not exists (select 1 from public.restaurants where id = v.restaurant_id and group_id = c.group_id) then
      raise exception 'El restaurant d''aquesta visita ja no existeix. Recupera''l primer.';
    end if;
    if not (v.shared or v.created_by = uid or not exists (select 1 from auth.users where id = v.created_by)) then
      raise exception 'Només l''autor pot recuperar una visita privada';
    end if;
    perform public.restore_visit_snapshot(c.old_data);
  end if;

  -- Recuperar un element no és una alta nova: es treuen les alertes que acaben de crear els triggers d'alta.
  if c.action = 'delete' then
    delete from public.alerts
     where group_id = c.group_id and created_at = now()
       and type in ('restaurant_added', 'wishlist_added', 'restaurant_reviewed');
  end if;

  update public.group_changes
     set restored_at = now(), restored_by = uid,
         restored_by_name = (select nickname from public.profiles where id = uid)
   where id = c.id;
end $$;

-- ---------------------------------------------------------------- Còpia i conversió

-- Mateix cos que a 0001, amb lat i lng en copiar un desitjat.
create or replace function public.copy_to_groups(p_type text, p_id uuid, p_group_ids uuid[])
    returns integer
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  n int := 0;
  new_id uuid;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  if p_type not in ('restaurant', 'wishlist') then raise exception 'Tipus invàlid'; end if;

  for gid in select distinct g from unnest(p_group_ids) as g loop
    if not public.is_group_member(gid) then
      raise exception 'No ets membre del grup %', gid;
    end if;
    new_id := null;

    if p_type = 'restaurant' then
      insert into public.restaurants (group_id, name, cuisine, price_range, address, lat, lng,
                                      rating, notes, link, instagram, favorite, created_by)
      select gid, r.name, r.cuisine, r.price_range, r.address, r.lat, r.lng,
             r.rating, r.notes, r.link, r.instagram, r.favorite, uid
        from public.restaurants r
       where r.id = p_id
         and r.group_id is distinct from gid
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;
    else
      insert into public.wishlist (group_id, restaurant_name, cuisine, price_range, recommended_by,
                                   notes, link, instagram, address, lat, lng, status, user_id)
      select gid, w.restaurant_name, w.cuisine, w.price_range, w.recommended_by,
             w.notes, w.link, w.instagram, w.address, w.lat, w.lng, w.status, uid
        from public.wishlist w
       where w.id = p_id
         and w.group_id is distinct from gid
         and ((w.group_id is null and w.user_id = uid)
              or (w.group_id is not null and public.is_group_member(w.group_id)))
      returning id into new_id;
    end if;

    if new_id is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Mateix cos que a 0003, amb les coordenades del desitjat al restaurant nou.
create or replace function public.convert_wishlist_to_restaurant(p_wishlist_id uuid, p_visited_on date, p_rating numeric,
                                                                 p_notes text, p_attendees uuid[], p_shared boolean default true)
    returns uuid
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  uid uuid := auth.uid();
  w public.wishlist;
  rid uuid;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  -- for update: si dues persones el converteixen alhora, la segona espera i, com que la primera l'esborra,
  -- ja no el troba. Així no es creen dos restaurants.
  select * into w from public.wishlist
   where id = p_wishlist_id
     and ((group_id is null and user_id = uid)
          or (group_id is not null and public.is_group_member(group_id)))
     for update;
  if not found then raise exception 'Desitjat no trobat'; end if;
  -- Desitjats convertits abans de 0002 que no s'han pogut associar al seu restaurant.
  if w.status = 'visited' then raise exception 'Aquest desitjat ja s''ha convertit en restaurant'; end if;

  -- Els triggers hi posen el nom d'autor, apliquen la quota i creen l'alerta del grup.
  insert into public.restaurants (group_id, name, cuisine, price_range, address, lat, lng, notes, link, instagram,
                                  created_by, wish_fulfilled_at, recommended_by)
  values (w.group_id, w.restaurant_name, w.cuisine, w.price_range, w.address, w.lat, w.lng,
          case when coalesce(w.notes, '') = '' then '' else left('(Desitjat original: ' || w.notes || ')', 2000) end,
          w.link, w.instagram, uid, now(), nullif(w.recommended_by, ''))
  returning id into rid;

  -- save_visit fa les mateixes comprovacions de visibilitat i d'assistents que una visita normal.
  perform public.save_visit(rid, p_visited_on, p_rating, p_notes, p_attendees, p_shared, null);

  insert into public.reactions (user_id, restaurant_id, emoji, created_at)
  select r.user_id, rid, r.emoji, r.created_at from public.reactions r where r.wishlist_id = w.id
  on conflict do nothing;

  perform set_config('onmenjem.converting_wishlist', w.id::text, true);
  delete from public.wishlist where id = w.id;
  perform set_config('onmenjem.converting_wishlist', '', true);
  return rid;
end $$;
