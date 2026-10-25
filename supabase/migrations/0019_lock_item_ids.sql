-- L'id dels restaurants i desitjats és fix: l'historial (group_changes.item_id), restore_group_change i els enllaços
-- ?r=<id> hi depenen. 0018 dona UPDATE sobre totes les columnes i lock_ownership (0001) no protegia l'id: un membre
-- podia canviar-lo i deixar desenllaçades les entrades anteriors de l'historial, que ja no es podrien desfer.

-- Igual que a 0001, més la comprovació de l'id (per a tothom: cap RPC ni trigger el canvia).
create or replace function public.lock_ownership()
returns trigger language plpgsql set search_path = '' as $$
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

-- En una alta des del client, l'id el genera sempre el servidor: si el client el pogués triar, podria ocupar l'id
-- d'un element esborrat i impedir que restore_group_change el recuperés. Les RPC (security definer, que corren com a
-- postgres) conserven l'id que reben, perquè restore_group_change torna a inserir l'element amb el mateix id.
-- No és security definer: current_user ha de ser el rol de la petició.
create or replace function public.assign_item_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    new.id := gen_random_uuid();
  end if;
  return new;
end $$;

revoke all on function public.assign_item_id() from public, anon, authenticated;

create trigger restaurants_assign_id before insert on public.restaurants
  for each row execute function public.assign_item_id();
create trigger wishlist_assign_id before insert on public.wishlist
  for each row execute function public.assign_item_id();
