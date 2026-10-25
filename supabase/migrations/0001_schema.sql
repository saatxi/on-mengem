-- Esquema complet d'On mengem?, generat amb pg_dump de producció (consolida les migracions 0001–0024; les originals
-- són a l'historial de git, commit 9c7ffb0). El dump crea les funcions abans que les taules: no se'n valida el cos fins al final.
SET check_function_bodies = false;

CREATE SCHEMA IF NOT EXISTS public;

create extension if not exists pgcrypto;


--
-- Name: cuisine; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.cuisine AS text
	CONSTRAINT cuisine_check CHECK (((VALUE = ''::text) OR (VALUE = ANY (ARRAY['Mediterrània'::text, 'Espanyola'::text, 'Catalana'::text, 'Basca'::text, 'Italiana'::text, 'Japonesa'::text, 'Asiàtica'::text, 'Índia'::text, 'Orient Mitjà'::text, 'Americana'::text, 'Marisc'::text, 'Bar'::text, 'Cerveseria'::text, 'Vinoteca'::text, 'Cafè'::text, 'Fleca'::text, 'Postres'::text, 'Esmorzar'::text, 'Brunch'::text, 'Graella'::text, 'Menjar ràpid'::text, 'Vegetariana'::text]))));


--
-- Name: assign_item_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_item_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if current_user = 'authenticated' then
    new.id := gen_random_uuid();
  end if;
  return new;
end $$;


--
-- Name: broadcast_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.broadcast_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  changed jsonb := '[]'::jsonb;
  t text;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    changed := changed || coalesce((select jsonb_agg(to_jsonb(n)) from new_rows n), '[]'::jsonb);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    changed := changed || coalesce((select jsonb_agg(to_jsonb(o)) from old_rows o), '[]'::jsonb);
  end if;

  for t in
    select distinct c.topic
      from jsonb_array_elements(changed) r
     cross join lateral public.change_topics(tg_table_name, r.value) as c(topic)
     where c.topic is not null
  loop
    perform realtime.send(jsonb_build_object('table', tg_table_name), 'change', t, true);
  end loop;
  return null;
end $$;


--
-- Name: can_edit_visit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_edit_visit(p_visit_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.restaurant_visits v
     where v.id = p_visit_id
       and ((v.group_id is null and v.created_by = auth.uid())
            or (v.group_id is not null and public.is_group_member(v.group_id)
                and (v.shared or v.created_by = auth.uid() or v.created_by is null
                     or not exists (select 1 from public.group_members m
                                     where m.group_id = v.group_id and m.user_id = v.created_by))))
  );
$$;


--
-- Name: can_receive_topic(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_receive_topic(p_topic text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_topic is null then return false; end if;
  if p_topic = 'user:' || uid::text then return true; end if;
  if p_topic ~ '^group:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.is_group_member(substr(p_topic, 7)::uuid);
  end if;
  return false;
end $_$;


--
-- Name: change_topics(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_topics(p_table text, p_row jsonb) RETURNS SETOF text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  gid uuid;
begin
  -- Grups i membres: la llista de grups de cada membre (nom, owner, membres) i la de qui entra o surt.
  if p_table in ('groups', 'group_members') then
    gid := coalesce(p_row ->> 'group_id', p_row ->> 'id')::uuid;
    return query select 'user:' || m.user_id from public.group_members m where m.group_id = gid;
    if p_table = 'group_members' then return next 'user:' || (p_row ->> 'user_id'); end if;
    return;
  end if;
  if p_table = 'profiles' then
    return next 'user:' || (p_row ->> 'id');
    return;
  end if;
  -- Contingut: el grup o, a l'espai personal, el propietari.
  if p_row ->> 'group_id' is not null then
    return next 'group:' || (p_row ->> 'group_id');
  else
    return next 'user:' || coalesce(p_row ->> 'created_by', p_row ->> 'user_id');
  end if;
end $$;


--
-- Name: clear_active_group(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_active_group() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.profiles set active_group_id = null
   where id = old.user_id and active_group_id = old.group_id;
  return old;
end $$;


--
-- Name: convert_wishlist_to_restaurant(uuid, date, numeric, text, uuid[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_wishlist_to_restaurant(p_wishlist_id uuid, p_visited_on date, p_rating numeric, p_notes text, p_attendees uuid[], p_shared boolean DEFAULT true) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: copy_to_groups(text, uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_to_groups(p_type text, p_id uuid, p_group_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    code text NOT NULL,
    owner_id uuid NOT NULL,
    owner_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT groups_code_check CHECK (((char_length(code) >= 4) AND (char_length(code) <= 16))),
    CONSTRAINT groups_description_check CHECK ((char_length(description) <= 300)),
    CONSTRAINT groups_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 80)))
);


--
-- Name: create_group(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_group(p_name text, p_description text DEFAULT ''::text) RETURNS public.groups
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
  values (g.id, uid, 'group_joined', 'Grup creat', nick || ' ha creat el grup "' || g.name || '".');
  return g;
end $$;


--
-- Name: delete_my_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_my_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticat' using errcode = '42501'; end if;
  delete from auth.users where id = uid;
end $$;


--
-- Name: delete_visit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_visit(p_visit_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: enforce_group_quota(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_group_quota() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  n int;
  max_rows int := public.quota_limit('owned_groups');
begin
  perform pg_advisory_xact_lock(hashtextextended('groups:' || new.owner_id::text, 0));
  select count(*) into n from public.groups where owner_id = new.owner_id;
  if n >= max_rows then
    perform public.raise_quota_exceeded(format(
      'Has arribat al límit de %s grups propis. Esborra''n o cedeix-ne algun per crear-ne un de nou.', max_rows));
  end if;
  return new;
end $$;


--
-- Name: enforce_item_quota(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_item_quota() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  owner uuid;
  n int;
  max_rows int;
begin
  if tg_op = 'UPDATE' and new.group_id is not distinct from old.group_id then return new; end if;

  if tg_table_name = 'restaurants' then
    owner := new.created_by;
  else
    owner := new.user_id;
  end if;

  if new.group_id is null then
    max_rows := public.quota_limit('personal_items');
    perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':personal:' || coalesce(owner::text, ''), 0));
    if tg_table_name = 'restaurants' then
      select count(*) into n from public.restaurants where group_id is null and created_by = owner;
    else
      select count(*) into n from public.wishlist where group_id is null and user_id = owner;
    end if;
    if n >= max_rows then
      perform public.raise_quota_exceeded(format(
        'Has arribat al límit de %s %s a l''espai personal. Esborra''n algun per afegir-ne de nous.',
        max_rows, case when tg_table_name = 'restaurants' then 'restaurants' else 'desitjats' end));
    end if;
  else
    max_rows := public.quota_limit('group_items');
    perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':group:' || new.group_id::text, 0));
    if tg_table_name = 'restaurants' then
      select count(*) into n from public.restaurants where group_id = new.group_id;
    else
      select count(*) into n from public.wishlist where group_id = new.group_id;
    end if;
    if n >= max_rows then
      perform public.raise_quota_exceeded(format(
        'Aquest grup ha arribat al límit de %s %s. Esborreu-ne algun per afegir-ne de nous.',
        max_rows, case when tg_table_name = 'restaurants' then 'restaurants' else 'desitjats' end));
    end if;
  end if;
  return new;
end $$;


--
-- Name: enforce_visit_quota(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_visit_quota() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  n int;
  max_rows int := public.quota_limit('restaurant_visits');
begin
  perform pg_advisory_xact_lock(hashtextextended('visits:' || new.restaurant_id::text, 0));
  select count(*) into n from public.restaurant_visits where restaurant_id = new.restaurant_id;
  if n >= max_rows then
    perform public.raise_quota_exceeded(format('Aquest restaurant ha arribat al límit de %s visites.', max_rows));
  end if;
  return new;
end $$;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nickname text NOT NULL,
    avatar text DEFAULT '🍕'::text NOT NULL,
    photo_url text,
    active_group_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname_changed_at timestamp with time zone,
    CONSTRAINT profiles_avatar_length CHECK (((char_length(avatar) >= 1) AND (char_length(avatar) <= 16))),
    CONSTRAINT profiles_nickname_check CHECK (((char_length(nickname) >= 2) AND (char_length(nickname) <= 50))),
    CONSTRAINT profiles_photo_https CHECK (((photo_url IS NULL) OR (photo_url ~* '^https://'::text)))
);


--
-- Name: get_my_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_profile() RETURNS SETOF public.profiles
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select * from public.profiles where id = auth.uid();
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

  insert into public.profiles (id, nickname, avatar, photo_url)
  values (
    new.id,
    left(nick, 50),
    avatars[1 + floor(random() * array_length(avatars, 1))::int],
    photo
  );
  return new;
end $$;


--
-- Name: handle_user_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  g record;
  heir uuid;
  heir_name text;
  nick text;
begin
  perform set_config('onmenjem.deleting_user', old.id::text, true);
  select nickname into nick from public.profiles where id = old.id;

  delete from public.restaurants where group_id is null and created_by = old.id;
  delete from public.wishlist where group_id is null and user_id = old.id;

  for g in select id from public.groups where owner_id = old.id for update loop
    heir := null;
    select m.user_id, p.nickname into heir, heir_name
      from public.group_members m left join public.profiles p on p.id = m.user_id
     where m.group_id = g.id and m.user_id <> old.id
     order by m.joined_at, m.user_id
     limit 1;
    if heir is not null then
      update public.groups set owner_id = heir, owner_name = heir_name where id = g.id;
    end if;
  end loop;

  -- Els grups sense cap altre membre cauen pel cascade: no cal avisar ningú.
  insert into public.alerts (group_id, user_id, type, title, message, read_by)
  select m.group_id, old.id, 'group_left', 'Un membre ha sortit del grup',
         coalesce(nick, 'Algú') || ' ha esborrat el compte i ja no és al grup "' || gr.name || '".',
         '{}'
    from public.group_members m
    join public.groups gr on gr.id = m.group_id
   where m.user_id = old.id
     and exists (select 1 from public.group_members o where o.group_id = m.group_id and o.user_id <> old.id);
  return old;
end $$;


--
-- Name: history_fields(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.history_fields(p_item_type text) RETURNS text[]
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select case p_item_type
    when 'restaurant' then array['name', 'cuisine', 'price_range', 'address', 'rating', 'notes', 'link', 'instagram', 'favorite']
    when 'wishlist' then array['restaurant_name', 'cuisine', 'price_range', 'recommended_by', 'address', 'notes', 'link',
                               'instagram', 'status']
    when 'visit' then array['visited_on', 'rating', 'notes', 'shared', 'attendees']
  end;
$$;


--
-- Name: is_deleting_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_deleting_user(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select coalesce(current_setting('onmenjem.deleting_user', true), '') = p_user_id::text;
$$;


--
-- Name: is_group_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_member(gid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;


--
-- Name: is_group_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_owner(gid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (select 1 from public.groups where id = gid and owner_id = auth.uid());
$$;


--
-- Name: join_group_by_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_group_by_code(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
  was_member boolean;
  recent int;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  perform pg_advisory_xact_lock(hashtextextended('join:' || uid::text, 0));
  delete from public.join_attempts where user_id = uid and attempted_at < now() - interval '1 day';
  select count(*) into recent from public.join_attempts
   where user_id = uid and attempted_at > now() - interval '10 minutes';
  if recent >= 10 then return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into g from public.groups where code = upper(trim(p_code)) for share;
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


--
-- Name: lock_ownership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_ownership() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: log_item_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_item_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: log_item_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_item_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: mark_alerts_read(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_alerts_read(p_ids uuid[]) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  update public.alerts
     set read_by = array_append(read_by, auth.uid())
   where id = any (p_ids)
     and public.is_group_member(group_id)
     and not (auth.uid() = any (read_by));
$$;


--
-- Name: move_restaurant_visits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_restaurant_visits() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.restaurant_visits set group_id = new.group_id where restaurant_id = new.id;
  return new;
end $$;


--
-- Name: move_to_group(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_to_group(p_type text, p_id uuid, p_group_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: new_group_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.new_group_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


--
-- Name: notify_group_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_group_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id)
  values (new.group_id, author, a_type, a_title, a_msg, rid);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;


--
-- Name: notify_member_left(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_member_left() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  actor uuid := auth.uid();
  g_name text;
  member_name text;
  actor_name text;
begin
  -- En esborrar el grup, la fila de groups ja no hi és quan cauen els membres.
  select name into g_name from public.groups where id = old.group_id;
  if not found then return old; end if;
  if public.is_deleting_user(old.user_id) then return old; end if;

  select nickname into member_name from public.profiles where id = old.user_id;
  member_name := coalesce(member_name, 'Algú');

  if actor is not null and actor is distinct from old.user_id then
    select nickname into actor_name from public.profiles where id = actor;
    insert into public.alerts (group_id, user_id, type, title, message, read_by)
    values (old.group_id, actor, 'group_left', 'Membre expulsat',
            coalesce(actor_name, 'Algú') || ' ha expulsat ' || member_name || ' del grup "' || g_name || '".',
            array[actor]);
  else
    insert into public.alerts (group_id, user_id, type, title, message, read_by)
    values (old.group_id, old.user_id, 'group_left', 'Un membre ha sortit del grup',
            member_name || ' ha sortit del grup "' || g_name || '".',
            array[old.user_id]);
  end if;
  return old;
end $$;


--
-- Name: notify_owner_changed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_owner_changed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  old_name text;
  msg text;
begin
  select nickname into old_name from public.profiles where id = old.owner_id;
  if public.is_deleting_user(old.owner_id) then
    msg := coalesce(new.owner_name, 'Algú') || ' és el nou creador del grup "' || new.name || '".';
  else
    msg := coalesce(old_name, 'Algú') || ' ha cedit el grup "' || new.name || '" a ' || coalesce(new.owner_name, 'un altre membre') || '.';
  end if;

  insert into public.alerts (group_id, user_id, type, title, message, read_by)
  values (new.id, old.owner_id, 'owner_changed', 'Nou creador del grup', msg, array[old.owner_id]);
  return new;
end $$;


--
-- Name: notify_visit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_visit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  rname text;
begin
  if new.group_id is null then return new; end if;
  select name into rname from public.restaurants where id = new.restaurant_id;

  insert into public.alerts (group_id, user_id, type, title, message, restaurant_id)
  values (new.group_id, new.created_by, 'restaurant_reviewed', 'Nova visita registrada!',
          coalesce(new.created_by_name, 'Algú') || ' ha registrat una visita a "' || coalesce(rname, 'un restaurant') || '".',
          new.restaurant_id);

  delete from public.alerts where group_id = new.group_id and created_at < now() - interval '90 days';
  return new;
end $$;


--
-- Name: protect_group_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_group_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  owner uuid;
begin
  select owner_id into owner from public.groups where id = old.group_id for share;
  if owner = old.user_id and not public.is_deleting_user(old.user_id) then
    raise exception 'L''owner no pot sortir del grup: cedeix-lo o esborra''l';
  end if;
  return old;
end $$;


--
-- Name: quota_limit(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quota_limit(p_name text) RETURNS integer
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
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


--
-- Name: raise_quota_exceeded(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.raise_quota_exceeded(p_message text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception '%', p_message using errcode = 'OMQ01';
end $$;


--
-- Name: record_group_change(uuid, text, uuid, text, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_group_change(p_group_id uuid, p_item_type text, p_item_id uuid, p_item_name text, p_action text, p_before jsonb, p_after jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
    if p_item_type = 'restaurant' and before_data ? 'address' then
      before_data := before_data || jsonb_build_object('lat', p_before -> 'lat', 'lng', p_before -> 'lng');
      after_data := after_data || jsonb_build_object('lat', p_after -> 'lat', 'lng', p_after -> 'lng');
    end if;
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


--
-- Name: regenerate_code_on_kick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_code_on_kick() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if old.user_id is distinct from auth.uid() and public.is_group_owner(old.group_id) then
    update public.groups set code = public.new_group_code() where id = old.group_id;
  end if;
  return old;
end $$;


--
-- Name: regenerate_group_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_group_code(p_group_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  new_code text;
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  if not public.is_group_owner(p_group_id) then raise exception 'Només l''owner pot canviar el codi'; end if;
  new_code := public.new_group_code();
  update public.groups set code = new_code where id = p_group_id;
  return new_code;
end $$;


--
-- Name: restore_group_change(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_group_change(p_change_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: restore_visit_snapshot(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_visit_snapshot(p_visit jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: save_visit(uuid, date, numeric, text, uuid[], boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_visit(p_restaurant_id uuid, p_visited_on date, p_rating numeric, p_notes text, p_attendees uuid[], p_shared boolean DEFAULT true, p_visit_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: set_author_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_author_name() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: shares_group_with(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shares_group_with(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.group_members a join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;


--
-- Name: sync_nickname_to_records(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_nickname_to_records() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if new.nickname is distinct from old.nickname then
    update public.restaurants
      set created_by_name = new.nickname
      where created_by = new.id;

    update public.restaurant_visits
      set created_by_name = new.nickname
      where created_by = new.id;

    update public.wishlist
      set user_name = new.nickname
      where user_id = new.id;

    update public.groups
      set owner_name = new.nickname
      where owner_id = new.id;
  end if;
  return new;
end $$;


--
-- Name: throttle_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.throttle_alerts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  n int;
begin
  if new.user_id is null then return new; end if;
  select count(*) into n from public.alerts
   where group_id = new.group_id and user_id = new.user_id and created_at > now() - interval '1 hour';
  if n >= public.quota_limit('group_alerts_per_hour') then return null; end if;
  return new;
end $$;


--
-- Name: throttle_nickname(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.throttle_nickname() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if new.nickname is not distinct from old.nickname then return new; end if;
  if old.nickname_changed_at > now() - make_interval(secs => public.quota_limit('nickname_interval_seconds')) then
    perform public.raise_quota_exceeded('Acabes de canviar el nom. Espera un minut per tornar-lo a canviar.');
  end if;
  new.nickname_changed_at := now();
  return new;
end $$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin new.updated_at = now(); return new; end $$;


--
-- Name: transfer_group_ownership(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_group_ownership(p_group_id uuid, p_new_owner uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  new_name text;
  owned int;
  max_groups int := public.quota_limit('owned_groups');
begin
  if auth.uid() is null then raise exception 'No autenticat'; end if;
  -- Les sortides i expulsions d'aquest grup esperen fins al final (protect_group_owner).
  perform 1 from public.groups where id = p_group_id for update;
  if not public.is_group_owner(p_group_id) then raise exception 'Només l''owner pot cedir el grup'; end if;
  if p_new_owner = auth.uid() or not exists (
    select 1 from public.group_members where group_id = p_group_id and user_id = p_new_owner
  ) then
    raise exception 'El nou owner ha de ser un altre membre del grup';
  end if;

  -- Mateix bloqueig que enforce_group_quota: una creació de grup simultània no passa del límit.
  perform pg_advisory_xact_lock(hashtextextended('groups:' || p_new_owner::text, 0));
  select count(*) into owned from public.groups where owner_id = p_new_owner;
  if owned >= max_groups then
    perform public.raise_quota_exceeded(format(
      'Aquest membre ja té %s grups propis i no en pot rebre cap més.', max_groups));
  end if;

  select nickname into new_name from public.profiles where id = p_new_owner;
  update public.groups set owner_id = p_new_owner, owner_name = new_name where id = p_group_id;
end $$;


--
-- Name: visit_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.visit_snapshot(p_visit_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select to_jsonb(v) || jsonb_build_object('attendees', coalesce(
           (select jsonb_agg(a.user_id order by a.user_id) from public.visit_attendees a where a.visit_id = v.id),
           '[]'::jsonb))
    from public.restaurant_visits v
   where v.id = p_visit_id;
$$;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    restaurant_id uuid,
    read_by uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alerts_message_check CHECK ((char_length(message) <= 1000)),
    CONSTRAINT alerts_title_check CHECK ((char_length(title) <= 200)),
    CONSTRAINT alerts_type_check CHECK ((type = ANY (ARRAY['restaurant_added'::text, 'wishlist_added'::text, 'group_joined'::text, 'restaurant_reviewed'::text, 'group_left'::text, 'owner_changed'::text])))
);


--
-- Name: group_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    item_type text NOT NULL,
    item_id uuid NOT NULL,
    item_name text,
    action text NOT NULL,
    old_data jsonb NOT NULL,
    new_data jsonb,
    changed_by uuid,
    changed_by_name text,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    restored_at timestamp with time zone,
    restored_by uuid,
    restored_by_name text,
    CONSTRAINT group_changes_action_check CHECK ((action = ANY (ARRAY['update'::text, 'delete'::text]))),
    CONSTRAINT group_changes_item_type_check CHECK ((item_type = ANY (ARRAY['restaurant'::text, 'wishlist'::text, 'visit'::text])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: join_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.join_attempts (
    user_id uuid NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: restaurant_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    group_id uuid,
    visited_on date,
    rating numeric(2,1),
    notes text,
    shared boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_visits_notes_check CHECK ((char_length(notes) <= 1000)),
    CONSTRAINT restaurant_visits_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    name text NOT NULL,
    cuisine public.cuisine,
    price_range text,
    address text,
    rating numeric(2,1),
    notes text,
    link text,
    instagram text,
    favorite boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lat double precision,
    lng double precision,
    CONSTRAINT restaurants_address_check CHECK ((char_length(address) <= 200)),
    CONSTRAINT restaurants_coordinates_pair CHECK (((lat IS NULL) = (lng IS NULL))),
    CONSTRAINT restaurants_instagram_handle CHECK (((instagram IS NULL) OR (instagram = ''::text) OR (instagram ~ '^[A-Za-z0-9._]{1,30}$'::text))),
    CONSTRAINT restaurants_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT restaurants_link_check CHECK ((char_length(link) <= 500)),
    CONSTRAINT restaurants_link_http CHECK (((link IS NULL) OR (link = ''::text) OR (link ~* '^https?://'::text))),
    CONSTRAINT restaurants_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
    CONSTRAINT restaurants_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120))),
    CONSTRAINT restaurants_notes_check CHECK ((char_length(notes) <= 2000)),
    CONSTRAINT restaurants_price_range_check CHECK ((char_length(price_range) <= 12)),
    CONSTRAINT restaurants_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: visit_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_attendees (
    visit_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    restaurant_name text NOT NULL,
    cuisine public.cuisine,
    price_range text,
    recommended_by text,
    notes text,
    link text,
    instagram text,
    status text DEFAULT 'pending'::text NOT NULL,
    user_id uuid,
    user_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address text,
    CONSTRAINT wishlist_address_check CHECK ((char_length(address) <= 200)),
    CONSTRAINT wishlist_instagram_handle CHECK (((instagram IS NULL) OR (instagram = ''::text) OR (instagram ~ '^[A-Za-z0-9._]{1,30}$'::text))),
    CONSTRAINT wishlist_link_check CHECK ((char_length(link) <= 500)),
    CONSTRAINT wishlist_link_http CHECK (((link IS NULL) OR (link = ''::text) OR (link ~* '^https?://'::text))),
    CONSTRAINT wishlist_notes_check CHECK ((char_length(notes) <= 2000)),
    CONSTRAINT wishlist_price_range_check CHECK ((char_length(price_range) <= 12)),
    CONSTRAINT wishlist_recommended_by_check CHECK ((char_length(recommended_by) <= 120)),
    CONSTRAINT wishlist_restaurant_name_check CHECK (((char_length(restaurant_name) >= 1) AND (char_length(restaurant_name) <= 120))),
    CONSTRAINT wishlist_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'planned'::text, 'visited'::text])))
);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: group_changes group_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_changes
    ADD CONSTRAINT group_changes_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_code_key UNIQUE (code);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: restaurant_visits restaurant_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_visits
    ADD CONSTRAINT restaurant_visits_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: visit_attendees visit_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_attendees
    ADD CONSTRAINT visit_attendees_pkey PRIMARY KEY (visit_id, user_id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (id);


--
-- Name: alerts_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alerts_group_idx ON public.alerts USING btree (group_id);


--
-- Name: group_changes_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_changes_group_idx ON public.group_changes USING btree (group_id, created_at DESC);


--
-- Name: group_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_members_user_idx ON public.group_members USING btree (user_id);


--
-- Name: join_attempts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX join_attempts_user_idx ON public.join_attempts USING btree (user_id, attempted_at);


--
-- Name: restaurant_visits_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurant_visits_group_idx ON public.restaurant_visits USING btree (group_id);


--
-- Name: restaurant_visits_restaurant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurant_visits_restaurant_idx ON public.restaurant_visits USING btree (restaurant_id);


--
-- Name: restaurants_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurants_group_idx ON public.restaurants USING btree (group_id);


--
-- Name: restaurants_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX restaurants_owner_idx ON public.restaurants USING btree (created_by) WHERE (group_id IS NULL);


--
-- Name: visit_attendees_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visit_attendees_user_idx ON public.visit_attendees USING btree (user_id);


--
-- Name: wishlist_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wishlist_group_idx ON public.wishlist USING btree (group_id);


--
-- Name: wishlist_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wishlist_owner_idx ON public.wishlist USING btree (user_id) WHERE (group_id IS NULL);


--
-- Name: alerts alerts_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER alerts_broadcast_delete AFTER DELETE ON public.alerts REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: alerts alerts_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER alerts_broadcast_insert AFTER INSERT ON public.alerts REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: alerts alerts_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER alerts_broadcast_update AFTER UPDATE ON public.alerts REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: alerts alerts_throttle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER alerts_throttle BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.throttle_alerts();


--
-- Name: group_changes group_changes_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_changes_broadcast_delete AFTER DELETE ON public.group_changes REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: group_changes group_changes_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_changes_broadcast_insert AFTER INSERT ON public.group_changes REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: group_changes group_changes_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_changes_broadcast_update AFTER UPDATE ON public.group_changes REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: group_members group_members_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_broadcast_delete AFTER DELETE ON public.group_members REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: group_members group_members_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_broadcast_insert AFTER INSERT ON public.group_members REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: group_members group_members_clear_active; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_clear_active AFTER DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.clear_active_group();


--
-- Name: group_members group_members_notify_left; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_notify_left AFTER DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.notify_member_left();


--
-- Name: group_members group_members_protect_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_protect_owner BEFORE DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.protect_group_owner();


--
-- Name: group_members group_members_regenerate_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER group_members_regenerate_code AFTER DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.regenerate_code_on_kick();


--
-- Name: groups groups_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_broadcast_update AFTER UPDATE ON public.groups REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: groups groups_notify_owner_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_notify_owner_changed AFTER UPDATE OF owner_id ON public.groups FOR EACH ROW WHEN ((old.owner_id IS DISTINCT FROM new.owner_id)) EXECUTE FUNCTION public.notify_owner_changed();


--
-- Name: groups groups_quota; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_quota BEFORE INSERT ON public.groups FOR EACH ROW EXECUTE FUNCTION public.enforce_group_quota();


--
-- Name: groups groups_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER groups_touch BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles profiles_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_broadcast_update AFTER UPDATE ON public.profiles REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: profiles profiles_sync_nickname; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_sync_nickname AFTER UPDATE OF nickname ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_nickname_to_records();


--
-- Name: profiles profiles_throttle_nickname; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_throttle_nickname BEFORE UPDATE OF nickname ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.throttle_nickname();


--
-- Name: restaurant_visits restaurant_visits_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_broadcast_delete AFTER DELETE ON public.restaurant_visits REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurant_visits restaurant_visits_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_broadcast_insert AFTER INSERT ON public.restaurant_visits REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurant_visits restaurant_visits_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_broadcast_update AFTER UPDATE ON public.restaurant_visits REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurant_visits restaurant_visits_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_notify AFTER INSERT ON public.restaurant_visits FOR EACH ROW EXECUTE FUNCTION public.notify_visit();


--
-- Name: restaurant_visits restaurant_visits_quota; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_quota BEFORE INSERT ON public.restaurant_visits FOR EACH ROW EXECUTE FUNCTION public.enforce_visit_quota();


--
-- Name: restaurant_visits restaurant_visits_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurant_visits_touch BEFORE UPDATE ON public.restaurant_visits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: restaurants restaurants_assign_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_assign_id BEFORE INSERT ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.assign_item_id();


--
-- Name: restaurants restaurants_author; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_author BEFORE INSERT ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_author_name();


--
-- Name: restaurants restaurants_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_broadcast_delete AFTER DELETE ON public.restaurants REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurants restaurants_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_broadcast_insert AFTER INSERT ON public.restaurants REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurants restaurants_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_broadcast_update AFTER UPDATE ON public.restaurants REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: restaurants restaurants_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_lock BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.lock_ownership();


--
-- Name: restaurants restaurants_log_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_log_delete BEFORE DELETE ON public.restaurants FOR EACH ROW WHEN ((old.group_id IS NOT NULL)) EXECUTE FUNCTION public.log_item_delete();


--
-- Name: restaurants restaurants_log_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_log_update AFTER UPDATE ON public.restaurants FOR EACH ROW WHEN ((old.group_id IS NOT NULL)) EXECUTE FUNCTION public.log_item_update();


--
-- Name: restaurants restaurants_move_visits; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_move_visits AFTER UPDATE OF group_id ON public.restaurants FOR EACH ROW WHEN ((old.group_id IS DISTINCT FROM new.group_id)) EXECUTE FUNCTION public.move_restaurant_visits();


--
-- Name: restaurants restaurants_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_notify AFTER INSERT OR UPDATE OF group_id ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.notify_group_item();


--
-- Name: restaurants restaurants_quota; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_quota BEFORE INSERT OR UPDATE OF group_id ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.enforce_item_quota();


--
-- Name: restaurants restaurants_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER restaurants_touch BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: wishlist wishlist_assign_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_assign_id BEFORE INSERT ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.assign_item_id();


--
-- Name: wishlist wishlist_author; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_author BEFORE INSERT ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.set_author_name();


--
-- Name: wishlist wishlist_broadcast_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_broadcast_delete AFTER DELETE ON public.wishlist REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: wishlist wishlist_broadcast_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_broadcast_insert AFTER INSERT ON public.wishlist REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: wishlist wishlist_broadcast_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_broadcast_update AFTER UPDATE ON public.wishlist REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.broadcast_changes();


--
-- Name: wishlist wishlist_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_lock BEFORE UPDATE ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.lock_ownership();


--
-- Name: wishlist wishlist_log_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_log_delete BEFORE DELETE ON public.wishlist FOR EACH ROW WHEN ((old.group_id IS NOT NULL)) EXECUTE FUNCTION public.log_item_delete();


--
-- Name: wishlist wishlist_log_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_log_update AFTER UPDATE ON public.wishlist FOR EACH ROW WHEN ((old.group_id IS NOT NULL)) EXECUTE FUNCTION public.log_item_update();


--
-- Name: wishlist wishlist_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_notify AFTER INSERT OR UPDATE OF group_id ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.notify_group_item();


--
-- Name: wishlist wishlist_quota; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_quota BEFORE INSERT OR UPDATE OF group_id ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.enforce_item_quota();


--
-- Name: wishlist wishlist_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wishlist_touch BEFORE UPDATE ON public.wishlist FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Les FK es creen en el mateix ordre que a les migracions originals: Postgres executa els ON DELETE CASCADE
-- en l'ordre de creació, i l'esborrat de comptes (handle_user_delete) en depèn.

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_active_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_active_group_fk FOREIGN KEY (active_group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: restaurants restaurants_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: restaurants restaurants_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wishlist wishlist_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: join_attempts join_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_attempts
    ADD CONSTRAINT join_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: restaurant_visits restaurant_visits_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_visits
    ADD CONSTRAINT restaurant_visits_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: restaurant_visits restaurant_visits_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_visits
    ADD CONSTRAINT restaurant_visits_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: restaurant_visits restaurant_visits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_visits
    ADD CONSTRAINT restaurant_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: visit_attendees visit_attendees_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_attendees
    ADD CONSTRAINT visit_attendees_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.restaurant_visits(id) ON DELETE CASCADE;


--
-- Name: visit_attendees visit_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_attendees
    ADD CONSTRAINT visit_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_changes group_changes_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_changes
    ADD CONSTRAINT group_changes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_changes group_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_changes
    ADD CONSTRAINT group_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_changes group_changes_restored_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_changes
    ADD CONSTRAINT group_changes_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts alerts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alerts_select ON public.alerts FOR SELECT TO authenticated USING (public.is_group_member(group_id));


--
-- Name: group_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: group_changes group_changes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_changes_select ON public.group_changes FOR SELECT TO authenticated USING (public.is_group_member(group_id));


--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_delete ON public.groups FOR DELETE TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: groups groups_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_select ON public.groups FOR SELECT TO authenticated USING (public.is_group_member(id));


--
-- Name: groups groups_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY groups_update ON public.groups FOR UPDATE TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: join_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.join_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_delete ON public.group_members FOR DELETE TO authenticated USING ((((user_id = auth.uid()) AND (NOT public.is_group_owner(group_id))) OR ((user_id <> auth.uid()) AND public.is_group_owner(group_id))));


--
-- Name: group_members members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_select ON public.group_members FOR SELECT TO authenticated USING (public.is_group_member(group_id));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.shares_group_with(id)));


--
-- Name: profiles profiles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND ((active_group_id IS NULL) OR public.is_group_member(active_group_id))));


--
-- Name: restaurant_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurant_visits restaurant_visits_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_visits_select ON public.restaurant_visits FOR SELECT TO authenticated USING ((((group_id IS NULL) AND (created_by = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id))));


--
-- Name: restaurants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurants restaurants_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_delete ON public.restaurants FOR DELETE TO authenticated USING ((((created_by = auth.uid()) AND ((group_id IS NULL) OR public.is_group_member(group_id))) OR ((group_id IS NOT NULL) AND public.is_group_owner(group_id))));


--
-- Name: restaurants restaurants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_insert ON public.restaurants FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND ((group_id IS NULL) OR public.is_group_member(group_id))));


--
-- Name: restaurants restaurants_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_select ON public.restaurants FOR SELECT TO authenticated USING ((((group_id IS NULL) AND (created_by = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id))));


--
-- Name: restaurants restaurants_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_update ON public.restaurants FOR UPDATE TO authenticated USING ((((group_id IS NULL) AND (created_by = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id)))) WITH CHECK ((((group_id IS NULL) AND (created_by = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id))));


--
-- Name: visit_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visit_attendees ENABLE ROW LEVEL SECURITY;

--
-- Name: visit_attendees visit_attendees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY visit_attendees_select ON public.visit_attendees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.restaurant_visits v
  WHERE ((v.id = visit_attendees.visit_id) AND (((v.group_id IS NULL) AND (v.created_by = auth.uid())) OR ((v.group_id IS NOT NULL) AND public.is_group_member(v.group_id)))))));


--
-- Name: wishlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlist wishlist_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_delete ON public.wishlist FOR DELETE TO authenticated USING ((((user_id = auth.uid()) AND ((group_id IS NULL) OR public.is_group_member(group_id))) OR ((group_id IS NOT NULL) AND public.is_group_owner(group_id))));


--
-- Name: wishlist wishlist_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_insert ON public.wishlist FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND ((group_id IS NULL) OR public.is_group_member(group_id))));


--
-- Name: wishlist wishlist_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_select ON public.wishlist FOR SELECT TO authenticated USING ((((group_id IS NULL) AND (user_id = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id))));


--
-- Name: wishlist wishlist_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wishlist_update ON public.wishlist FOR UPDATE TO authenticated USING ((((group_id IS NULL) AND (user_id = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id)))) WITH CHECK ((((group_id IS NULL) AND (user_id = auth.uid())) OR ((group_id IS NOT NULL) AND public.is_group_member(group_id))));


--
-- PostgreSQL database dump complete
--

-- Privilegis explícits (equivalent de 0018_explicit_table_grants.sql)
revoke all on table
  public.profiles, public.groups, public.group_members, public.restaurants, public.wishlist, public.alerts,
  public.join_attempts, public.restaurant_visits, public.visit_attendees, public.group_changes
  from anon, authenticated, service_role;

grant select, insert, update, delete on public.restaurants, public.wishlist to authenticated;
grant select, delete on public.groups to authenticated;
grant update (name, description) on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select (id, nickname, avatar, photo_url, created_at) on public.profiles to authenticated;
grant update (nickname, avatar, active_group_id, last_login_at) on public.profiles to authenticated;
grant select on public.alerts, public.restaurant_visits, public.visit_attendees, public.group_changes to authenticated;
grant select, insert, update, delete on table
  public.profiles, public.groups, public.group_members, public.restaurants, public.wishlist, public.alerts,
  public.join_attempts, public.restaurant_visits, public.visit_attendees, public.group_changes
  to service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- Objectes fora de public i EXECUTE de les funcions, que el dump (--schema=public --no-acl) no inclou.

-- Perfil en crear un usuari i neteja en esborrar-lo.
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_auth_user_deleted before delete on auth.users for each row execute function public.handle_user_delete();

-- Realtime: cada usuari només rep els avisos dels canals group:<id> i user:<id> que li pertoquen.
create policy on_mengem_receive_changes on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.can_receive_topic((select realtime.topic())));

-- EXECUTE: les funcions internes no es poden cridar per RPC; les RPC de l'app, només amb sessió (authenticated).
revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
revoke all on function public.new_group_code() from public, anon, authenticated;
revoke all on function public.create_group(text, text) from public, anon;
revoke all on function public.join_group_by_code(text) from public, anon;
revoke all on function public.regenerate_group_code(uuid) from public, anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public, anon;
revoke all on function public.mark_alerts_read(uuid[]) from public, anon;
revoke all on function public.copy_to_groups(text, uuid, uuid[]) from public, anon;
revoke all on function public.move_to_group(text, uuid, uuid) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.regenerate_group_code(uuid) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.mark_alerts_read(uuid[]) to authenticated;
grant execute on function public.copy_to_groups(text, uuid, uuid[]) to authenticated;
grant execute on function public.move_to_group(text, uuid, uuid) to authenticated;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.move_restaurant_visits() from public, anon, authenticated;
revoke all on function public.notify_visit() from public, anon, authenticated;
revoke all on function public.can_edit_visit(uuid) from public, anon;
revoke all on function public.save_visit(uuid, date, numeric, text, uuid[], boolean, uuid) from public, anon;
revoke all on function public.delete_visit(uuid) from public, anon;
grant execute on function public.can_edit_visit(uuid) to authenticated;
grant execute on function public.save_visit(uuid, date, numeric, text, uuid[], boolean, uuid) to authenticated;
grant execute on function public.delete_visit(uuid) to authenticated;
revoke all on function public.quota_limit(text) from public, anon, authenticated;
revoke all on function public.raise_quota_exceeded(text) from public, anon, authenticated;
revoke all on function public.enforce_item_quota() from public, anon, authenticated;
revoke all on function public.enforce_group_quota() from public, anon, authenticated;
revoke all on function public.enforce_visit_quota() from public, anon, authenticated;
revoke all on function public.throttle_alerts() from public, anon, authenticated;
revoke all on function public.convert_wishlist_to_restaurant(uuid, date, numeric, text, uuid[], boolean) from public, anon;
grant execute on function public.convert_wishlist_to_restaurant(uuid, date, numeric, text, uuid[], boolean) to authenticated;
revoke all on function public.regenerate_code_on_kick() from public, anon, authenticated;
revoke all on function public.throttle_nickname() from public, anon, authenticated;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
revoke all on function public.is_deleting_user(uuid) from public, anon, authenticated;
revoke all on function public.notify_member_left() from public, anon, authenticated;
revoke all on function public.notify_owner_changed() from public, anon, authenticated;
revoke all on function public.history_fields(text) from public, anon, authenticated;
revoke all on function public.visit_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.record_group_change(uuid, text, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.log_item_update() from public, anon, authenticated;
revoke all on function public.log_item_delete() from public, anon, authenticated;
revoke all on function public.restore_visit_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public.restore_group_change(uuid) from public, anon;
grant execute on function public.restore_group_change(uuid) to authenticated;
revoke all on function public.change_topics(text, jsonb) from public, anon, authenticated;
revoke all on function public.broadcast_changes() from public, anon, authenticated;
revoke all on function public.can_receive_topic(text) from public, anon;
grant execute on function public.can_receive_topic(text) to authenticated;
revoke all on function public.assign_item_id() from public, anon, authenticated;
revoke all on function public.protect_group_owner() from public, anon, authenticated;

RESET check_function_bodies;

