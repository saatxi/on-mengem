-- On menjem? — enduriment de seguretat i robustesa (veure docs/SEGURETAT.md)
-- Codis d'invitació, límit d'intents, propietat dels grups, esborrat de comptes,
-- alertes generades pel servidor i validació d'URL.

-- ---------------------------------------------------------------- Helpers (search_path buit)

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups where id = gid and owner_id = auth.uid());
$$;

create or replace function public.shares_group_with(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

-- ---------------------------------------------------------------- Esquema

-- Esborrar un compte no ha d'endur-se el contingut que va aportar als grups.
alter table public.restaurants alter column created_by drop not null;
alter table public.restaurants drop constraint restaurants_created_by_fkey;
alter table public.restaurants add constraint restaurants_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.wishlist alter column user_id drop not null;
alter table public.wishlist drop constraint wishlist_user_id_fkey;
alter table public.wishlist add constraint wishlist_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.alerts alter column user_id drop not null;
alter table public.alerts drop constraint alerts_user_id_fkey;
alter table public.alerts add constraint alerts_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- Només URL http(s) (not valid: no revisa les files existents, sí les noves i modificades).
alter table public.wishlist add constraint wishlist_link_http
  check (link is null or link = '' or link ~* '^https?://') not valid;
alter table public.profiles add constraint profiles_photo_https
  check (photo_url is null or photo_url ~* '^https://') not valid;

-- Intents fallits d'unir-se amb codi (només accessible des de les funcions).
create table public.join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_idx on public.join_attempts (user_id, attempted_at);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

-- Només es poden editar columnes concretes des del client.
revoke update on public.groups from authenticated;
grant update (name, description) on public.groups to authenticated;
revoke update on public.profiles from authenticated;
grant update (nickname, avatar, active_group_id, last_login_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------- Triggers

-- created_by / user_id només canvien a NULL quan s'esborra el compte (cascade); group_id només via RPC.
-- Els noms d'autor tampoc es poden falsificar des del client.
create or replace function public.lock_ownership()
returns trigger language plpgsql set search_path = '' as $$
declare
  is_client boolean := current_user = 'authenticated';
begin
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

-- El nom d'autor sempre ve del perfil, mai del client.
create or replace function public.set_author_name()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n text;
begin
  if tg_table_name = 'restaurants' then
    select nickname into n from public.profiles where id = new.created_by;
    if found then new.created_by_name := n; end if;
  else
    select nickname into n from public.profiles where id = new.user_id;
    if found then new.user_name := n; end if;
  end if;
  return new;
end $$;

create trigger restaurants_author before insert on public.restaurants
  for each row execute function public.set_author_name();
create trigger wishlist_author before insert on public.wishlist
  for each row execute function public.set_author_name();

-- Les alertes d'ítems les genera el servidor (atòmic amb l'alta o el moviment a un grup).
-- També purga les alertes del grup de més de 90 dies.
create or replace function public.notify_group_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
  a_type text;
  a_title text;
  a_msg text;
  rid uuid;
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
    a_type := 'wishlist_added';
    a_title := 'Nou desitjat proposat!';
    a_msg := coalesce(new.user_name, 'Algú') || ' vol anar a provar "' || new.restaurant_name || '".';
  end if;

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id, read_by)
  values (new.group_id, author, a_type, a_title, a_msg, rid,
          case when author is null then '{}'::uuid[] else array[author] end);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;

create trigger restaurants_notify after insert or update of group_id on public.restaurants
  for each row execute function public.notify_group_item();
create trigger wishlist_notify after insert or update of group_id on public.wishlist
  for each row execute function public.notify_group_item();

-- Si un usuari surt (o l'expulsen) d'un grup, aquest deixa de ser el seu espai actiu.
create or replace function public.clear_active_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set active_group_id = null
   where id = old.user_id and active_group_id = old.group_id;
  return old;
end $$;

create trigger group_members_clear_active after delete on public.group_members
  for each row execute function public.clear_active_group();

-- Abans d'esborrar un usuari: elimina el seu espai personal i cedeix els grups que tenia
-- al membre més antic (si no queda ningú, el grup cau pel cascade).
create or replace function public.handle_user_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  g record;
  heir uuid;
  heir_name text;
begin
  delete from public.restaurants where group_id is null and created_by = old.id;
  delete from public.wishlist where group_id is null and user_id = old.id;

  for g in select id from public.groups where owner_id = old.id loop
    select m.user_id, p.nickname into heir, heir_name
      from public.group_members m left join public.profiles p on p.id = m.user_id
     where m.group_id = g.id and m.user_id <> old.id
     order by m.joined_at, m.user_id
     limit 1;
    if heir is not null then
      update public.groups set owner_id = heir, owner_name = heir_name where id = g.id;
    end if;
  end loop;
  return old;
end $$;

create trigger on_auth_user_deleted before delete on auth.users
  for each row execute function public.handle_user_delete();

-- El perfil nou només accepta fotos https (el valor ve de user_metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  avatars text[] := array['🍕','🍣','🥘','🍷','🌮','🍔','🥗','🍜','🥑','🥞','☕','🍰'];
  nick text;
  photo text;
begin
  nick := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  if nick is null or char_length(nick) < 2 then nick := 'Gourmet'; end if;

  photo := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  if photo is null or photo !~* '^https://' then photo := null; end if;

  insert into public.profiles (id, nickname, avatar, email, photo_url)
  values (
    new.id,
    left(nick, 50),
    avatars[1 + floor(random() * array_length(avatars, 1))::int],
    new.email,
    photo
  );
  return new;
end $$;

-- ---------------------------------------------------------------- RLS

-- profiles: no es pot esborrar el perfil (el trigger no el tornaria a crear) ni apuntar a un grup aliè.
drop policy profiles_delete on public.profiles;
drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid()
      and (active_group_id is null or public.is_group_member(active_group_id)));

-- group_members: un membre pot sortir, l'owner pot expulsar els altres però no pot sortir
-- (ha de cedir el grup o esborrar-lo).
drop policy members_delete on public.group_members;
create policy members_delete on public.group_members for delete to authenticated
  using ((user_id = auth.uid() and not public.is_group_owner(group_id))
      or (user_id <> auth.uid() and public.is_group_owner(group_id)));

-- alerts: ja no es creen des del client.
drop policy alerts_insert on public.alerts;

-- ---------------------------------------------------------------- RPC

-- Codi d'invitació de 6 caràcters amb aleatorietat criptogràfica (bytes d'un UUID v4).
create or replace function public.new_group_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 caràcters: sense biaix amb % 32
  bytes bytea;
  c text;
begin
  loop
    bytes := uuid_send(gen_random_uuid());
    c := '';
    for i in 0..5 loop
      c := c || substr(chars, 1 + (get_byte(bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.groups where code = c);
  end loop;
  return c;
end $$;

create or replace function public.create_group(p_name text, p_description text default '')
returns public.groups language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  select coalesce(nickname, 'Gourmet') into nick from public.profiles where id = uid;

  insert into public.groups (name, description, code, owner_id, owner_name)
  values (left(trim(p_name), 80), left(coalesce(trim(p_description), ''), 300),
          public.new_group_code(), uid, nick)
  returning * into g;

  insert into public.group_members (group_id, user_id) values (g.id, uid);
  update public.profiles set active_group_id = g.id where id = uid;

  insert into public.alerts (group_id, user_id, type, title, message)
  values (g.id, uid, 'group_joined', 'Grup creat',
          nick || ' ha creat el grup "' || g.name || '". Codi d''invitació: ' || g.code);
  return g;
end $$;

-- Retorna {error: 'GROUP_NOT_FOUND' | 'TOO_MANY_ATTEMPTS'} en lloc de llançar una excepció,
-- perquè una excepció desfaria el registre de l'intent fallit.
create or replace function public.join_group_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
  was_member boolean;
  recent int;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  delete from public.join_attempts where user_id = uid and attempted_at < now() - interval '1 day';
  select count(*) into recent from public.join_attempts
   where user_id = uid and attempted_at > now() - interval '10 minutes';
  if recent >= 10 then return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into g from public.groups where code = upper(trim(p_code));
  if not found then
    insert into public.join_attempts (user_id) values (uid);
    return jsonb_build_object('error', 'GROUP_NOT_FOUND');
  end if;

  select coalesce(nickname, 'Gourmet') into nick from public.profiles where id = uid;
  was_member := exists (select 1 from public.group_members where group_id = g.id and user_id = uid);

  if not was_member then
    insert into public.group_members (group_id, user_id) values (g.id, uid);
    insert into public.alerts (group_id, user_id, type, title, message)
    values (g.id, uid, 'group_joined', 'Nou membre al grup!',
            nick || ' s''ha unit al grup "' || g.name || '".');
  end if;

  update public.profiles set active_group_id = g.id where id = uid;
  return jsonb_build_object('id', g.id, 'name', g.name, 'already_member', was_member);
end $$;

-- Només l'owner: genera un codi nou (invalida l'anterior).
create or replace function public.regenerate_group_code(p_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  new_code text;
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  if not public.is_group_owner(p_group_id) then raise exception 'Només l''owner pot canviar el codi'; end if;
  new_code := public.new_group_code();
  update public.groups set code = new_code where id = p_group_id;
  return new_code;
end $$;

-- Només l'owner: cedeix el grup a un altre membre.
create or replace function public.transfer_group_ownership(p_group_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  new_name text;
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  if not public.is_group_owner(p_group_id) then raise exception 'Només l''owner pot cedir el grup'; end if;
  if p_new_owner = auth.uid() or not exists (
    select 1 from public.group_members where group_id = p_group_id and user_id = p_new_owner
  ) then
    raise exception 'El nou owner ha de ser un altre membre del grup';
  end if;
  select nickname into new_name from public.profiles where id = p_new_owner;
  update public.groups set owner_id = p_new_owner, owner_name = new_name where id = p_group_id;
end $$;

create or replace function public.mark_alerts_read(p_ids uuid[])
returns void language sql security definer set search_path = '' as $$
  update public.alerts
     set read_by = array_append(read_by, auth.uid())
   where id = any (p_ids)
     and public.is_group_member(group_id)
     and not (auth.uid() = any (read_by));
$$;

-- Copia un restaurant/desitjat visible per l'usuari a un o varis grups on és membre
-- (sense duplicar grups repetits ni copiar al grup d'origen). L'alerta la crea el trigger.
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
                                      rating, notes, tags, visited, favorite, created_by)
      select gid, r.name, r.cuisine, r.price_range, r.address, r.city, r.phone,
             r.rating, r.notes, r.tags, r.visited, r.favorite, uid
        from public.restaurants r
       where r.id = p_id
         and r.group_id is distinct from gid
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;
    else
      insert into public.wishlist (group_id, restaurant_name, cuisine, price_range, recommended_by,
                                   notes, link, status, user_id)
      select gid, w.restaurant_name, w.cuisine, w.price_range, w.recommended_by,
             w.notes, w.link, w.status, uid
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

-- Mou un ítem de l'espai personal a un grup (només el propietari). L'alerta la crea el trigger.
create or replace function public.move_to_group(p_type text, p_id uuid, p_group_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  rows_moved int;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'No ets membre d''aquest grup'; end if;

  if p_type = 'restaurant' then
    update public.restaurants set group_id = p_group_id
     where id = p_id and group_id is null and created_by = uid;
  elsif p_type = 'wishlist' then
    update public.wishlist set group_id = p_group_id
     where id = p_id and group_id is null and user_id = uid;
  else
    raise exception 'Tipus invàlid';
  end if;

  get diagnostics rows_moved = row_count;
  if rows_moved = 0 then raise exception 'Ítem no trobat a l''espai personal'; end if;
end $$;

-- Només usuaris autenticats poden cridar les RPC; les funcions internes no són cridables.
revoke all on function public.new_group_code() from public, anon, authenticated;
revoke all on function public.regenerate_group_code(uuid) from public, anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public, anon;
grant execute on function public.regenerate_group_code(uuid) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
