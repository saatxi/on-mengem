-- Convertir un desitjat en restaurant l'esborra: el restaurant guarda quan es va complir el desig i qui el va
-- recomanar, i els «desitjos complerts» de l'any es compten des dels restaurants (abans, des dels desitjats
-- marcats com a 'visited' segons updated_at, que canviava d'any si algú els editava).

-- ---------------------------------------------------------------- Columnes d'origen del restaurant

alter table public.restaurants
  add column wish_fulfilled_at timestamp with time zone,
  add column recommended_by text,
  add constraint restaurants_recommended_by_check check ((char_length(recommended_by) <= 120));

comment on column public.restaurants.wish_fulfilled_at is
  'Quan es va convertir des d''un desitjat (NULL = no ve de cap desitjat). Només l''omple convert_wishlist_to_restaurant.';
comment on column public.restaurants.recommended_by is
  'Qui va recomanar el desitjat d''origen. Només l''omple convert_wishlist_to_restaurant.';

-- El client no pot fixar l'origen en crear un restaurant. Sense security definer: dins de
-- convert_wishlist_to_restaurant (security definer), current_user ja no és authenticated.
create function public.clear_wish_origin() returns trigger
    language plpgsql
    set search_path to ''
    as $$
begin
  if current_user = 'authenticated' then
    new.wish_fulfilled_at := null;
    new.recommended_by := null;
  end if;
  return new;
end $$;

create trigger restaurants_clear_wish_origin before insert on public.restaurants
  for each row execute function public.clear_wish_origin();

-- Ni modificar-lo després (mateix cos que a 0001 amb la comprovació de les columnes d'origen).
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
    if is_client and (new.wish_fulfilled_at is distinct from old.wish_fulfilled_at
                      or new.recommended_by is distinct from old.recommended_by) then
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

-- ---------------------------------------------------------------- Historial

-- L'esborrat que fa la conversió no va a l'historial: desfer-lo tornaria a crear el desitjat amb el restaurant
-- ja creat. Mateix patró que onmenjem.deleting_user (vegeu docs/SEGURETAT.md).
create function public.is_converting_wishlist(p_wishlist_id uuid) returns boolean
    language sql stable
    set search_path to ''
    as $$
  select coalesce(current_setting('onmenjem.converting_wishlist', true), '') = p_wishlist_id::text;
$$;

create or replace function public.log_item_delete() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  o jsonb := to_jsonb(old);
begin
  if not exists (select 1 from public.groups where id = old.group_id) then return old; end if;
  if tg_table_name = 'wishlist' and public.is_converting_wishlist(old.id) then return old; end if;
  if tg_table_name = 'restaurants' then
    o := o || jsonb_build_object('visits', coalesce(
      (select jsonb_agg(public.visit_snapshot(v.id) order by v.created_at)
         from public.restaurant_visits v where v.restaurant_id = old.id),
      '[]'::jsonb));
  end if;
  perform public.record_group_change(
    old.group_id,
    case tg_table_name when 'restaurants' then 'restaurant' else 'wishlist' end,
    old.id, coalesce(o ->> 'name', o ->> 'restaurant_name'), 'delete', o);
  return old;
end $$;

-- ---------------------------------------------------------------- Conversió

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
  insert into public.restaurants (group_id, name, cuisine, price_range, address, notes, link, instagram, created_by,
                                  wish_fulfilled_at, recommended_by)
  values (w.group_id, w.restaurant_name, w.cuisine, w.price_range, w.address,
          case when coalesce(w.notes, '') = '' then '' else left('(Desitjat original: ' || w.notes || ')', 2000) end,
          w.link, w.instagram, uid, now(), nullif(w.recommended_by, ''))
  returning id into rid;

  -- save_visit fa les mateixes comprovacions de visibilitat i d'assistents que una visita normal.
  perform public.save_visit(rid, p_visited_on, p_rating, p_notes, p_attendees, p_shared, null);

  perform set_config('onmenjem.converting_wishlist', w.id::text, true);
  delete from public.wishlist where id = w.id;
  perform set_config('onmenjem.converting_wishlist', '', true);
  return rid;
end $$;

-- ---------------------------------------------------------------- Dades existents

-- Els desitjats ja convertits no estan vinculats al seu restaurant: es busca pel mateix espai i nom i, si n'hi ha
-- més d'un, pel creat més a prop del moment de la conversió (updated_at del desitjat). Els que no en tenen cap
-- (restaurant esborrat o reanomenat) es queden com a 'visited' i l'app els continua mostrant com a «Provats».
do $$
declare
  m record;
begin
  for m in
    select distinct on (w.id) w.id as wishlist_id, w.updated_at, w.recommended_by, r.id as restaurant_id
      from public.wishlist w
      join public.restaurants r
        on r.name = w.restaurant_name
       and ((w.group_id is not null and r.group_id = w.group_id)
            or (w.group_id is null and r.group_id is null and r.created_by = w.user_id))
     where w.status = 'visited'
       and r.wish_fulfilled_at is null
     order by w.id, abs(extract(epoch from r.created_at - w.updated_at))
  loop
    update public.restaurants
       set wish_fulfilled_at = m.updated_at, recommended_by = nullif(m.recommended_by, '')
     where id = m.restaurant_id and wish_fulfilled_at is null;
    if found then
      perform set_config('onmenjem.converting_wishlist', m.wishlist_id::text, true);
      delete from public.wishlist where id = m.wishlist_id;
    end if;
  end loop;
  perform set_config('onmenjem.converting_wishlist', '', true);
end $$;

-- ---------------------------------------------------------------- Privilegis

revoke all on function public.clear_wish_origin() from public, anon, authenticated;
revoke all on function public.is_converting_wishlist(uuid) from public, anon, authenticated;
