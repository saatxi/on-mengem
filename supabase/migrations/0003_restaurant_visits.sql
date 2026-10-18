-- Registre de visites als restaurants (substitueix el booleà restaurants.visited).
-- Cada visita té data, valoració, nota i assistents, i pot ser grupal (qualsevol membre l'edita)
-- o privada (tothom del grup la veu, però només l'autor l'edita). El client només hi escriu via RPC.

-- ---------------------------------------------------------------- Taules

create table public.restaurant_visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade, -- còpia del restaurant; NULL = personal
  visited_on date, -- NULL = data desconeguda (visites migrades del booleà antic)
  rating numeric(2, 1) check (rating between 0 and 5),
  notes text check (char_length(notes) <= 1000),
  shared boolean not null default true, -- true = grupal, false = privada (a l'espai personal no té efecte)
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurant_visits_restaurant_idx on public.restaurant_visits (restaurant_id);
create index restaurant_visits_group_idx on public.restaurant_visits (group_id);

create table public.visit_attendees (
  visit_id uuid not null references public.restaurant_visits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (visit_id, user_id)
);
create index visit_attendees_user_idx on public.visit_attendees (user_id);

create trigger restaurant_visits_touch before update on public.restaurant_visits
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- Migració del booleà

-- Cada restaurant marcat com a visitat conserva una visita sense data ni assistents.
insert into public.restaurant_visits (restaurant_id, group_id, visited_on, created_by, created_by_name, created_at, updated_at)
select id, group_id, null, created_by, created_by_name, updated_at, updated_at
  from public.restaurants
 where visited;

-- copy_to_groups deixa de copiar `visited`. Les visites no es copien: el grup destí comença el seu historial
-- (i els assistents podrien no ser-ne membres).
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
      insert into public.restaurants (group_id, name, cuisine, price_range, address, city, phone,
                                      rating, notes, link, instagram, favorite, created_by)
      select gid, r.name, r.cuisine, r.price_range, r.address, r.city, r.phone,
             r.rating, r.notes, r.link, r.instagram, r.favorite, uid
        from public.restaurants r
       where r.id = p_id
         and r.group_id is distinct from gid
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;
    else
      insert into public.wishlist (group_id, restaurant_name, cuisine, price_range, recommended_by,
                                   notes, link, instagram, status, user_id)
      select gid, w.restaurant_name, w.cuisine, w.price_range, w.recommended_by,
             w.notes, w.link, w.instagram, w.status, uid
        from public.wishlist w
       where w.id = p_id
         and w.group_id is distinct from gid
         and ((w.group_id is null and w.user_id = uid)
              or (w.group_id is not null and public.is_group_member(w.group_id)))
      returning id into new_id;
    end if;

    if new_id is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;

alter table public.restaurants drop column visited;

-- ---------------------------------------------------------------- Triggers

-- move_to_group: les visites acompanyen el restaurant al grup nou.
create or replace function public.move_restaurant_visits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.restaurant_visits set group_id = new.group_id where restaurant_id = new.id;
  return new;
end $$;

create trigger restaurants_move_visits after update of group_id on public.restaurants
  for each row when (old.group_id is distinct from new.group_id)
  execute function public.move_restaurant_visits();

-- Una visita nova en un grup genera una alerta (i purga les de més de 90 dies, com notify_group_item).
create or replace function public.notify_visit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rname text;
begin
  if new.group_id is null then return new; end if;
  select name into rname from public.restaurants where id = new.restaurant_id;

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id, read_by)
  values (new.group_id, new.created_by, 'restaurant_reviewed', 'Nova visita registrada!',
          coalesce(new.created_by_name, 'Algú') || ' ha registrat una visita a "' || coalesce(rname, 'un restaurant') || '".',
          new.restaurant_id,
          case when new.created_by is null then '{}'::uuid[] else array[new.created_by] end);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;

create trigger restaurant_visits_notify after insert on public.restaurant_visits
  for each row execute function public.notify_visit();

-- ---------------------------------------------------------------- RLS

alter table public.restaurant_visits enable row level security;
alter table public.visit_attendees enable row level security;

-- Només lectura des del client; les escriptures van per save_visit / delete_visit.
revoke insert, update, delete on public.restaurant_visits from anon, authenticated;
revoke insert, update, delete on public.visit_attendees from anon, authenticated;

create policy restaurant_visits_select on public.restaurant_visits for select to authenticated
  using ((group_id is null and created_by = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)));
create policy visit_attendees_select on public.visit_attendees for select to authenticated
  using (exists (
    select 1 from public.restaurant_visits v
     where v.id = visit_id
       and ((v.group_id is null and v.created_by = auth.uid())
            or (v.group_id is not null and public.is_group_member(v.group_id)))
  ));

-- ---------------------------------------------------------------- RPC

-- Pot editar o esborrar la visita: a l'espai personal, el propietari; en un grup, qualsevol membre si és
-- grupal, i si és privada només l'autor (o qualsevol membre si l'autor ha esborrat el compte).
create or replace function public.can_edit_visit(p_visit_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_visits v
     where v.id = p_visit_id
       and ((v.group_id is null and v.created_by = auth.uid())
            or (v.group_id is not null and public.is_group_member(v.group_id)
                and (v.shared or v.created_by = auth.uid() or v.created_by is null)))
  );
$$;

-- Crea (p_visit_id NULL) o edita una visita i en substitueix els assistents, tot de manera atòmica.
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
  nick text;
  v public.restaurant_visits;
  vid uuid;
  is_shared boolean := coalesce(p_shared, true);
  attendee uuid;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  select r.group_id into gid from public.restaurants r
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
    update public.restaurant_visits
       set visited_on = p_visited_on, rating = p_rating, notes = nullif(trim(p_notes), ''), shared = is_shared
     where id = p_visit_id;
    vid := p_visit_id;
    delete from public.visit_attendees where visit_id = vid;
  end if;

  insert into public.visit_attendees (visit_id, user_id)
  select vid, a from (select distinct unnest(coalesce(p_attendees, '{}'::uuid[])) as a) s;
  return vid;
end $$;

create or replace function public.delete_visit(p_visit_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  if not public.can_edit_visit(p_visit_id) then raise exception 'No pots esborrar aquesta visita'; end if;
  delete from public.restaurant_visits where id = p_visit_id;
end $$;

revoke all on function public.move_restaurant_visits() from public, anon, authenticated;
revoke all on function public.notify_visit() from public, anon, authenticated;
revoke all on function public.can_edit_visit(uuid) from public, anon;
revoke all on function public.save_visit(uuid, date, numeric, text, uuid[], boolean, uuid) from public, anon;
revoke all on function public.delete_visit(uuid) from public, anon;
grant execute on function public.can_edit_visit(uuid) to authenticated;
grant execute on function public.save_visit(uuid, date, numeric, text, uuid[], boolean, uuid) to authenticated;
grant execute on function public.delete_visit(uuid) to authenticated;

-- ---------------------------------------------------------------- Realtime

alter publication supabase_realtime add table public.restaurant_visits, public.visit_attendees;
