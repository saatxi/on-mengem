-- Elimina les columnes city i phone de la taula restaurants.
-- L'adreça exacta (address) conté la informació de localització completa.
-- copy_to_groups s'actualitza perquè ja no fa referència a city ni phone.

alter table public.restaurants drop column if exists city;
alter table public.restaurants drop column if exists phone;

create or replace function public.copy_to_groups(p_type text, p_id uuid, p_group_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
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
      insert into public.restaurants (group_id, name, cuisine, price_range, address,
                                      rating, notes, link, instagram, favorite, created_by)
      select gid, r.name, r.cuisine, r.price_range, r.address,
             r.rating, r.notes, r.link, r.instagram, r.favorite, uid
        from public.restaurants r
       where r.id = p_id
         and r.group_id is distinct from gid
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;
    else
      insert into public.wishlist (group_id, restaurant_name, cuisine, price_range, recommended_by,
                                   notes, link, instagram, address, status, user_id)
      select gid, w.restaurant_name, w.cuisine, w.price_range, w.recommended_by,
             w.notes, w.link, w.instagram, w.address, w.status, uid
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
