-- Conversió atòmica d'un desitjat en restaurant: marca el desitjat com a visitat, crea el restaurant al mateix
-- espai i hi registra la primera visita, tot en una transacció. Abans eren tres crides des del client, i si
-- fallava la darrera el restaurant quedava creat sense visita.

create or replace function public.convert_wishlist_to_restaurant(
  p_wishlist_id uuid,
  p_visited_on date,
  p_rating numeric,
  p_notes text,
  p_attendees uuid[],
  p_shared boolean default true
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  w public.wishlist;
  rid uuid;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  -- for update: dues conversions simultànies del mateix desitjat no poden crear dos restaurants.
  select * into w from public.wishlist
   where id = p_wishlist_id
     and ((group_id is null and user_id = uid)
          or (group_id is not null and public.is_group_member(group_id)))
     for update;
  if not found then raise exception 'Desitjat no trobat'; end if;
  if w.status = 'visited' then raise exception 'Aquest desitjat ja s''ha convertit en restaurant'; end if;

  update public.wishlist set status = 'visited' where id = w.id;

  -- Els triggers hi posen el nom d'autor, apliquen la quota i creen l'alerta del grup.
  insert into public.restaurants (group_id, name, cuisine, price_range, address, notes, link, instagram, created_by)
  values (w.group_id, w.restaurant_name, w.cuisine, w.price_range, w.address,
          case when coalesce(w.notes, '') = '' then '' else left('(Desitjat original: ' || w.notes || ')', 2000) end,
          w.link, w.instagram, uid)
  returning id into rid;

  -- save_visit fa les mateixes comprovacions de visibilitat i d'assistents que una visita normal.
  perform public.save_visit(rid, p_visited_on, p_rating, p_notes, p_attendees, p_shared, null);
  return rid;
end $$;

revoke all on function public.convert_wishlist_to_restaurant(uuid, date, numeric, text, uuid[], boolean) from public, anon;
grant execute on function public.convert_wishlist_to_restaurant(uuid, date, numeric, text, uuid[], boolean) to authenticated;
