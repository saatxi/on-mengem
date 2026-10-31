-- Les alertes d'un desitjat nou i d'una visita nova guarden a quin ítem es refereixen (com ja feien amb restaurant_id),
-- perquè l'app hi pugui mostrar les reaccions i reaccionar-hi des del feed d'activitat. Sense FK: una alerta
-- sobreviu a l'ítem, i l'app només hi mostra reaccions si l'ítem encara existeix.

alter table public.alerts
  add column wishlist_id uuid,
  add column visit_id uuid;

-- Mateix cos que a 0001, amb wishlist_id a les alertes de desitjats.
create or replace function public.notify_group_item() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  author uuid;
  a_type text;
  a_title text;
  a_msg text;
  rid uuid;
  wid uuid;
begin
  if new.group_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.group_id is not distinct from new.group_id then return new; end if;

  if tg_table_name = 'restaurants' then
    author := new.created_by;
    rid := new.id;
    a_type := 'restaurant_added';
    a_title := 'Nou restaurant afegit!';
    a_msg := coalesce(new.created_by_name, 'Algú') || ' ha afegit "' || new.name || '" a la col·lecció del grup.';
  else
    author := new.user_id;
    wid := new.id;
    a_type := 'wishlist_added';
    a_title := 'Nou desitjat proposat!';
    a_msg := coalesce(new.user_name, 'Algú') || ' vol anar a provar "' || new.restaurant_name || '".';
  end if;

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id, wishlist_id)
  values (new.group_id, author, a_type, a_title, a_msg, rid, wid);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;

-- Mateix cos que a 0001, amb visit_id.
create or replace function public.notify_visit() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  rname text;
begin
  if new.group_id is null then return new; end if;
  select name into rname from public.restaurants where id = new.restaurant_id;

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id, visit_id)
  values (new.group_id, new.created_by, 'restaurant_reviewed', 'Nova visita registrada!',
          coalesce(new.created_by_name, 'Algú') || ' ha registrat una visita a "' || coalesce(rname, 'un restaurant') || '".',
          new.restaurant_id, new.id);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;
