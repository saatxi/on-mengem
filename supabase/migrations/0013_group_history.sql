-- Historial de canvis dels grups: qualsevol membre pot editar els restaurants i desitjats del grup i les visites
-- grupals, i el creador d'un restaurant l'esborra amb les visites de tothom. Ara cada edició i cada esborrat del
-- contingut d'un grup queda registrat (qui, quan, valors anteriors) i qualsevol membre el pot desfer.
-- 1. group_changes: una fila per edició (només els camps que han canviat, abans i després) o per esborrat (la fila
--    sencera; un restaurant s'hi desa amb les seves visites i assistents). Els membres la llegeixen; ningú hi escriu.
-- 2. Restaurants i desitjats: triggers (el client hi escriu directament). Visites: save_visit i delete_visit, perquè
--    els assistents canvien després de la fila de la visita.
-- 3. restore_group_change(): torna els camps al valor anterior o recupera l'element esborrat.
-- No es registren les altes (ja tenen alerta), l'espai personal ni els canvis interns (autor, nom d'autor, dates).
-- Es purguen les entrades de més de 90 dies i les que passen de quota_limit('group_changes') per grup.

-- ---------------------------------------------------------------- 1. Taula

create table public.group_changes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  item_type text not null check (item_type in ('restaurant', 'wishlist', 'visit')),
  item_id uuid not null, -- sense FK: l'element pot estar esborrat
  item_name text, -- nom del restaurant o desitjat en el moment del canvi
  action text not null check (action in ('update', 'delete')),
  old_data jsonb not null, -- update: camps canviats; delete: la fila sencera
  new_data jsonb, -- update: camps canviats; delete: NULL
  changed_by uuid references auth.users (id) on delete set null,
  changed_by_name text,
  -- clock_timestamp() i no now(): els canvis d'una mateixa transacció han de quedar ordenats.
  created_at timestamptz not null default clock_timestamp(),
  restored_at timestamptz,
  restored_by uuid references auth.users (id) on delete set null,
  restored_by_name text
);
create index group_changes_group_idx on public.group_changes (group_id, created_at desc);

alter table public.group_changes enable row level security;
revoke insert, update, delete on public.group_changes from anon, authenticated;

create policy group_changes_select on public.group_changes for select to authenticated
  using (public.is_group_member(group_id));

-- Igual que a 0011, amb el límit d'entrades de l'historial.
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
    when 'group_changes' then 1000       -- entrades de l'historial d'un grup (es descarten les més antigues)
  end;
end $$;

-- ---------------------------------------------------------------- 2. Registre

-- Camps que edita la gent; la resta (autor, nom d'autor, dates, group_id) els canvia el servidor.
create or replace function public.history_fields(p_item_type text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_item_type
    when 'restaurant' then array['name', 'cuisine', 'price_range', 'address', 'rating', 'notes', 'link', 'instagram', 'favorite']
    when 'wishlist' then array['restaurant_name', 'cuisine', 'price_range', 'recommended_by', 'address', 'notes', 'link',
                               'instagram', 'status']
    when 'visit' then array['visited_on', 'rating', 'notes', 'shared', 'attendees']
  end;
$$;

-- Visita amb els assistents (ordenats, perquè dues llistes iguals es comparin com a iguals).
create or replace function public.visit_snapshot(p_visit_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(v) || jsonb_build_object('attendees', coalesce(
           (select jsonb_agg(a.user_id order by a.user_id) from public.visit_attendees a where a.visit_id = v.id),
           '[]'::jsonb))
    from public.restaurant_visits v
   where v.id = p_visit_id;
$$;

-- Desa una entrada. En una edició només es guarden els camps que han canviat (un text buit i NULL compten com a
-- iguals); si no n'ha canviat cap, no es desa res.
create or replace function public.record_group_change(
  p_group_id uuid,
  p_item_type text,
  p_item_id uuid,
  p_item_name text,
  p_action text,
  p_before jsonb,
  p_after jsonb default null
)
returns void language plpgsql security definer set search_path = '' as $$
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

-- Edició d'un restaurant o desitjat d'un grup (moure'l de l'espai personal no hi entra: old.group_id és NULL).
create or replace function public.log_item_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n jsonb := to_jsonb(new);
begin
  if new.group_id is distinct from old.group_id then return null; end if;
  perform public.record_group_change(
    old.group_id,
    case tg_table_name when 'restaurants' then 'restaurant' else 'wishlist' end,
    old.id, coalesce(n ->> 'name', n ->> 'restaurant_name'), 'update', to_jsonb(old), n);
  return null;
end $$;

-- Esborrat: before delete, perquè les visites del restaurant encara hi siguin (després cauen pel cascade).
-- En esborrar el grup, la fila de groups ja no hi és quan cau el contingut: no es registra res.
create or replace function public.log_item_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := to_jsonb(old);
begin
  if not exists (select 1 from public.groups where id = old.group_id) then return old; end if;
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

create trigger restaurants_log_update after update on public.restaurants
  for each row when (old.group_id is not null) execute function public.log_item_update();
create trigger wishlist_log_update after update on public.wishlist
  for each row when (old.group_id is not null) execute function public.log_item_update();
create trigger restaurants_log_delete before delete on public.restaurants
  for each row when (old.group_id is not null) execute function public.log_item_delete();
create trigger wishlist_log_delete before delete on public.wishlist
  for each row when (old.group_id is not null) execute function public.log_item_delete();

-- Igual que a 0003_restaurant_visits.sql, però registra les edicions de visites de grup a l'historial.
create or replace function public.save_visit(
  p_restaurant_id uuid,
  p_visited_on date,
  p_rating numeric,
  p_notes text,
  p_attendees uuid[],
  p_shared boolean default true,
  p_visit_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  gid uuid;
  rname text;
  nick text;
  v public.restaurant_visits;
  vid uuid;
  is_shared boolean := coalesce(p_shared, true);
  attendee uuid;
  before_visit jsonb;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  select r.group_id, r.name into gid, rname from public.restaurants r
   where r.id = p_restaurant_id
     and ((r.group_id is null and r.created_by = uid)
          or (r.group_id is not null and public.is_group_member(r.group_id)));
  if not found then raise exception 'Restaurant no trobat'; end if;
  if gid is null then is_shared := true; end if;

  -- Assistents: membres del grup o, a l'espai personal, només el propietari.
  for attendee in select distinct a from unnest(coalesce(p_attendees, '{}'::uuid[])) as a loop
    if gid is null then
      if attendee <> uid then raise exception 'A l''espai personal només hi pots constar tu'; end if;
    elsif not exists (select 1 from public.group_members where group_id = gid and user_id = attendee) then
      raise exception 'Els assistents han de ser membres del grup';
    end if;
  end loop;

  if p_visit_id is null then
    select nickname into nick from public.profiles where id = uid;
    insert into public.restaurant_visits (restaurant_id, group_id, visited_on, rating, notes, shared,
                                          created_by, created_by_name)
    values (p_restaurant_id, gid, p_visited_on, p_rating, nullif(trim(p_notes), ''), is_shared, uid, nick)
    returning id into vid;
  else
    select * into v from public.restaurant_visits where id = p_visit_id and restaurant_id = p_restaurant_id for update;
    if not found or not public.can_edit_visit(p_visit_id) then
      raise exception 'No pots editar aquesta visita';
    end if;
    if v.shared is distinct from is_shared and v.created_by is distinct from uid then
      raise exception 'Només l''autor pot canviar si la visita és privada';
    end if;
    before_visit := public.visit_snapshot(p_visit_id);
    update public.restaurant_visits
       set visited_on = p_visited_on, rating = p_rating, notes = nullif(trim(p_notes), ''), shared = is_shared
     where id = p_visit_id;
    vid := p_visit_id;
    delete from public.visit_attendees where visit_id = vid;
  end if;

  insert into public.visit_attendees (visit_id, user_id)
  select vid, a from (select distinct unnest(coalesce(p_attendees, '{}'::uuid[])) as a) s;

  if p_visit_id is not null and gid is not null then
    perform public.record_group_change(gid, 'visit', vid, rname, 'update', before_visit, public.visit_snapshot(vid));
  end if;
  return vid;
end $$;

-- Igual que a 0003_restaurant_visits.sql, però registra l'esborrat de visites de grup a l'historial.
create or replace function public.delete_visit(p_visit_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  gid uuid;
  rname text;
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  if not public.can_edit_visit(p_visit_id) then raise exception 'No pots esborrar aquesta visita'; end if;

  select v.group_id, r.name into gid, rname
    from public.restaurant_visits v join public.restaurants r on r.id = v.restaurant_id
   where v.id = p_visit_id;
  if gid is not null then
    perform public.record_group_change(gid, 'visit', p_visit_id, rname, 'delete', public.visit_snapshot(p_visit_id));
  end if;
  delete from public.restaurant_visits where id = p_visit_id;
end $$;

-- ---------------------------------------------------------------- 3. Desfer

-- Torna a inserir una visita esborrada. L'autor i els assistents que ja no hi són (compte esborrat o fora del grup)
-- no es recuperen.
create or replace function public.restore_visit_snapshot(p_visit jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.restaurant_visits := jsonb_populate_record(null::public.restaurant_visits, p_visit);
begin
  if not exists (select 1 from auth.users where id = v.created_by) then v.created_by := null; end if;
  insert into public.restaurant_visits values (v.*);
  insert into public.visit_attendees (visit_id, user_id)
  select v.id, a.user_id
    from (select value::uuid as user_id from jsonb_array_elements_text(coalesce(p_visit -> 'attendees', '[]'::jsonb))) a
   where exists (select 1 from public.group_members m where m.group_id = v.group_id and m.user_id = a.user_id);
end $$;

-- Qualsevol membre del grup pot desfer una edició (els camps tornen al valor d'abans, encara que després
-- s'hagin tornat a canviar) o recuperar un element esborrat. Les visites privades, només si les podria editar.
-- Desfer una edició és una edició més i queda a l'historial; cada entrada només es pot desfer un cop.
create or replace function public.restore_group_change(p_change_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
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
       set name = r.name, cuisine = r.cuisine, price_range = r.price_range, address = r.address, rating = r.rating,
           notes = r.notes, link = r.link, instagram = r.instagram, favorite = r.favorite
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
           instagram = w.instagram, status = w.status
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

-- ---------------------------------------------------------------- Permisos i Realtime

revoke all on function public.history_fields(text) from public, anon, authenticated;
revoke all on function public.visit_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.record_group_change(uuid, text, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.log_item_update() from public, anon, authenticated;
revoke all on function public.log_item_delete() from public, anon, authenticated;
revoke all on function public.restore_visit_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public.restore_group_change(uuid) from public, anon;
grant execute on function public.restore_group_change(uuid) to authenticated;

alter publication supabase_realtime add table public.group_changes;
