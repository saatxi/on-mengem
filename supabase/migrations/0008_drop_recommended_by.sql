-- Es treu «Qui ho ha recomanat?» dels desitjats: s'esborra la columna recommended_by de wishlist i de restaurants (on
-- guardava l'origen en convertir un desitjat; wish_fulfilled_at es conserva). Les dades d'aquesta columna es perden. Les
-- entrades antigues de l'historial que encara porten la clau recommended_by no fan cap mal: en recuperar-les s'ignora.

-- ---------------------------------------------------------------- Funcions i triggers (abans d'esborrar les columnes)

-- Mateix cos que a 0001, sense recommended_by.
create or replace function public.history_fields(p_item_type text) returns text[]
    language sql immutable
    set search_path to ''
    as $$
  select case p_item_type
    when 'restaurant' then array['name', 'cuisine', 'price_range', 'address', 'rating', 'notes', 'link', 'instagram', 'favorite']
    when 'wishlist' then array['restaurant_name', 'cuisine', 'price_range', 'address', 'notes', 'link', 'instagram', 'status']
    when 'visit' then array['visited_on', 'rating', 'notes', 'shared', 'attendees']
  end;
$$;

-- Mateix cos que a 0002, sense recommended_by.
create or replace function public.clear_wish_origin() returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    new.wish_fulfilled_at := null;
  end if;
  return new;
end $$;

-- Mateix cos que a 0002, sense la comprovació de recommended_by.
create or replace function public.lock_ownership() returns trigger
    language plpgsql
    set search_path to ''
    as $$
declare
  is_client boolean := current_user = 'authenticated';
begin
  if new.id is distinct from old.id then
    raise exception 'id és immutable';
  end if;
  -- if anidats: plpgsql no garanteix curtcircuit amb "and", i new.<camp> falla si la taula no el té.
  if tg_table_name = 'restaurants' then
    if new.created_by is distinct from old.created_by and (is_client or new.created_by is not null) then
      raise exception 'created_by és immutable';
    end if;
    if is_client and new.created_by_name is distinct from old.created_by_name then
      raise exception 'created_by_name és immutable';
    end if;
    if is_client and new.wish_fulfilled_at is distinct from old.wish_fulfilled_at then
      raise exception 'L''origen del restaurant és immutable';
    end if;
  elsif tg_table_name = 'wishlist' then
    if new.user_id is distinct from old.user_id and (is_client or new.user_id is not null) then
      raise exception 'user_id és immutable';
    end if;
    if is_client and new.user_name is distinct from old.user_name then
      raise exception 'user_name és immutable';
    end if;
  end if;
  if new.group_id is distinct from old.group_id and is_client then
    raise exception 'Per canviar d''espai fes servir move_to_group()';
  end if;
  return new;
end $$;

-- Mateix cos que a 0007, sense recommended_by en desfer l'edició d'un desitjat.
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
       set name = r.name, cuisine = r.cuisine, price_range = r.price_range, address = r.address, city = r.city, district = r.district, lat = r.lat,
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
           address = w.address, notes = w.notes, link = w.link,
           instagram = w.instagram, status = w.status, lat = w.lat, lng = w.lng, city = w.city, district = w.district
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

-- Mateix cos que a 0007, sense recommended_by en copiar un desitjat.
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
      insert into public.restaurants (group_id, name, cuisine, price_range, address, lat, lng, city, district,
                                      rating, notes, link, instagram, favorite, created_by)
      select gid, r.name, r.cuisine, r.price_range, r.address, r.lat, r.lng, r.city, r.district,
             r.rating, r.notes, r.link, r.instagram, r.favorite, uid
        from public.restaurants r
       where r.id = p_id
         and r.group_id is distinct from gid
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;
    else
      insert into public.wishlist (group_id, restaurant_name, cuisine, price_range,
                                   notes, link, instagram, address, lat, lng, city, district, status, user_id)
      select gid, w.restaurant_name, w.cuisine, w.price_range,
             w.notes, w.link, w.instagram, w.address, w.lat, w.lng, w.city, w.district, w.status, uid
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

-- Mateix cos que a 0007, sense recommended_by al restaurant nou.
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
  insert into public.restaurants (group_id, name, cuisine, price_range, address, lat, lng, city, district, notes, link, instagram,
                                  created_by, wish_fulfilled_at)
  values (w.group_id, w.restaurant_name, w.cuisine, w.price_range, w.address, w.lat, w.lng, w.city, w.district,
          case when coalesce(w.notes, '') = '' then '' else left('(Desitjat original: ' || w.notes || ')', 2000) end,
          w.link, w.instagram, uid, now())
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

-- ---------------------------------------------------------------- Columnes

alter table public.restaurants drop column recommended_by;
alter table public.wishlist drop column recommended_by;
