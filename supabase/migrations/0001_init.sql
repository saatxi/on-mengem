-- On menjem? — esquema inicial (Supabase / Postgres)
-- Espai personal: restaurants/wishlist amb group_id NULL (només visibles pel seu creador).
-- Espai de grup: group_id informat (visible pels membres del grup).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Taules

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 50),
  avatar text not null default '🍕',
  email text,
  photo_url text,
  active_group_id uuid, -- NULL = espai personal
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  code text not null unique check (char_length(code) between 4 and 16),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

alter table public.profiles
  add constraint profiles_active_group_fk
  foreign key (active_group_id) references public.groups (id) on delete set null;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade, -- NULL = personal
  name text not null check (char_length(name) between 1 and 120),
  cuisine text check (char_length(cuisine) <= 80),
  price_range text check (char_length(price_range) <= 8),
  address text check (char_length(address) <= 200),
  city text check (char_length(city) <= 100),
  phone text check (char_length(phone) <= 40),
  rating numeric(2, 1) check (rating between 0 and 5),
  notes text check (char_length(notes) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  visited boolean not null default false,
  favorite boolean not null default false,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_group_idx on public.restaurants (group_id);
create index restaurants_owner_idx on public.restaurants (created_by) where group_id is null;

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade, -- NULL = personal
  restaurant_name text not null check (char_length(restaurant_name) between 1 and 120),
  cuisine text check (char_length(cuisine) <= 80),
  price_range text check (char_length(price_range) <= 8),
  recommended_by text check (char_length(recommended_by) <= 120),
  notes text check (char_length(notes) <= 2000),
  link text check (char_length(link) <= 500),
  status text not null default 'pending' check (status in ('pending', 'planned', 'visited')),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wishlist_group_idx on public.wishlist (group_id);
create index wishlist_owner_idx on public.wishlist (user_id) where group_id is null;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('restaurant_added', 'wishlist_added', 'group_joined', 'restaurant_reviewed')),
  title text not null check (char_length(title) <= 200),
  message text not null check (char_length(message) <= 1000),
  restaurant_id uuid,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index alerts_group_idx on public.alerts (group_id);

-- ---------------------------------------------------------------- Helpers

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = gid and owner_id = auth.uid());
$$;

create or replace function public.shares_group_with(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- ---------------------------------------------------------------- Triggers

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger groups_touch before update on public.groups
  for each row execute function public.touch_updated_at();
create trigger restaurants_touch before update on public.restaurants
  for each row execute function public.touch_updated_at();
create trigger wishlist_touch before update on public.wishlist
  for each row execute function public.touch_updated_at();

-- created_by / group_id només es canvien des de les RPC (security definer).
create or replace function public.lock_ownership()
returns trigger language plpgsql as $$
begin
  -- if anidats: plpgsql no garanteix curtcircuit amb "and", i new.<camp> falla si la taula no el té.
  if tg_table_name = 'restaurants' then
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by és immutable';
    end if;
  elsif tg_table_name = 'wishlist' then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id és immutable';
    end if;
  end if;
  if new.group_id is distinct from old.group_id and current_user = 'authenticated' then
    raise exception 'Per canviar d''espai fes servir move_to_group()';
  end if;
  return new;
end $$;

create trigger restaurants_lock before update on public.restaurants
  for each row execute function public.lock_ownership();
create trigger wishlist_lock before update on public.wishlist
  for each row execute function public.lock_ownership();

-- Nou usuari: NOMÉS es crea el perfil (cap grup, cap alerta, cap dada d'exemple).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  avatars text[] := array['🍕','🍣','🥘','🍷','🌮','🍔','🥗','🍜','🥑','🥞','☕','🍰'];
  nick text;
begin
  nick := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  if nick is null or char_length(nick) < 2 then nick := 'Gourmet'; end if;

  insert into public.profiles (id, nickname, avatar, email, photo_url)
  values (
    new.id,
    left(nick, 50),
    avatars[1 + floor(random() * array_length(avatars, 1))::int],
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.restaurants enable row level security;
alter table public.wishlist enable row level security;
alter table public.alerts enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete on public.profiles for delete to authenticated
  using (id = auth.uid());

-- groups (creació i unió només via RPC)
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy groups_update on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy groups_delete on public.groups for delete to authenticated
  using (owner_id = auth.uid());

-- group_members (insert només via RPC)
create policy members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
create policy members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_owner(group_id));

-- restaurants
create policy restaurants_select on public.restaurants for select to authenticated
  using ((group_id is null and created_by = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)));
create policy restaurants_insert on public.restaurants for insert to authenticated
  with check (created_by = auth.uid()
      and (group_id is null or public.is_group_member(group_id)));
create policy restaurants_update on public.restaurants for update to authenticated
  using ((group_id is null and created_by = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)))
  with check ((group_id is null and created_by = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)));
create policy restaurants_delete on public.restaurants for delete to authenticated
  using (created_by = auth.uid()
      or (group_id is not null and public.is_group_owner(group_id)));

-- wishlist
create policy wishlist_select on public.wishlist for select to authenticated
  using ((group_id is null and user_id = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)));
create policy wishlist_insert on public.wishlist for insert to authenticated
  with check (user_id = auth.uid()
      and (group_id is null or public.is_group_member(group_id)));
create policy wishlist_update on public.wishlist for update to authenticated
  using ((group_id is null and user_id = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)))
  with check ((group_id is null and user_id = auth.uid())
      or (group_id is not null and public.is_group_member(group_id)));
create policy wishlist_delete on public.wishlist for delete to authenticated
  using (user_id = auth.uid()
      or (group_id is not null and public.is_group_owner(group_id)));

-- alerts (read_by només via mark_alerts_read)
create policy alerts_select on public.alerts for select to authenticated
  using (public.is_group_member(group_id));
create policy alerts_insert on public.alerts for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

-- ---------------------------------------------------------------- RPC

create or replace function public.create_group(p_name text, p_description text default '')
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nick text;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  g public.groups;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  select nickname into nick from profiles where id = uid;

  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from groups where code = new_code);
  end loop;

  insert into groups (name, description, code, owner_id, owner_name)
  values (left(trim(p_name), 80), left(coalesce(trim(p_description), ''), 300), new_code, uid, nick)
  returning * into g;

  insert into group_members (group_id, user_id) values (g.id, uid);
  update profiles set active_group_id = g.id where id = uid;

  insert into alerts (group_id, user_id, type, title, message)
  values (g.id, uid, 'group_joined', 'Grup creat',
          nick || ' ha creat el grup "' || g.name || '". Codi d''invitació: ' || g.code);
  return g;
end $$;

create or replace function public.join_group_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
  was_member boolean;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  select * into g from groups where code = upper(trim(p_code));
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;

  select nickname into nick from profiles where id = uid;
  was_member := exists (select 1 from group_members where group_id = g.id and user_id = uid);

  if not was_member then
    insert into group_members (group_id, user_id) values (g.id, uid);
    insert into alerts (group_id, user_id, type, title, message)
    values (g.id, uid, 'group_joined', 'Nou membre al grup!',
            nick || ' s''ha unit al grup "' || g.name || '".');
  end if;

  update profiles set active_group_id = g.id where id = uid;
  return jsonb_build_object('id', g.id, 'name', g.name, 'already_member', was_member);
end $$;

create or replace function public.mark_alerts_read(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update alerts
     set read_by = array_append(read_by, auth.uid())
   where id = any (p_ids)
     and public.is_group_member(group_id)
     and not (auth.uid() = any (read_by));
$$;

-- Copia un restaurant/desitjat visible per l'usuari a un o varis grups on és membre.
create or replace function public.copy_to_groups(p_type text, p_id uuid, p_group_ids uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nick text;
  gid uuid;
  n int := 0;
  new_id uuid;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  if p_type not in ('restaurant', 'wishlist') then raise exception 'Tipus invàlid'; end if;
  select nickname into nick from profiles where id = uid;

  foreach gid in array p_group_ids loop
    if not public.is_group_member(gid) then
      raise exception 'No ets membre del grup %', gid;
    end if;

    if p_type = 'restaurant' then
      insert into restaurants (group_id, name, cuisine, price_range, address, city, phone,
                               rating, notes, tags, visited, favorite, created_by, created_by_name)
      select gid, r.name, r.cuisine, r.price_range, r.address, r.city, r.phone,
             r.rating, r.notes, r.tags, r.visited, r.favorite, uid, nick
        from restaurants r
       where r.id = p_id
         and ((r.group_id is null and r.created_by = uid)
              or (r.group_id is not null and public.is_group_member(r.group_id)))
      returning id into new_id;

      if new_id is not null then
        insert into alerts (group_id, user_id, type, title, message, restaurant_id, read_by)
        select gid, uid, 'restaurant_added', 'Nou restaurant afegit!',
               nick || ' ha afegit "' || name || '" a la col·lecció del grup.', new_id, array[uid]
          from restaurants where id = new_id;
        n := n + 1;
      end if;
    else
      insert into wishlist (group_id, restaurant_name, cuisine, price_range, recommended_by,
                            notes, link, status, user_id, user_name)
      select gid, w.restaurant_name, w.cuisine, w.price_range, w.recommended_by,
             w.notes, w.link, w.status, uid, nick
        from wishlist w
       where w.id = p_id
         and ((w.group_id is null and w.user_id = uid)
              or (w.group_id is not null and public.is_group_member(w.group_id)))
      returning id into new_id;

      if new_id is not null then
        insert into alerts (group_id, user_id, type, title, message, read_by)
        select gid, uid, 'wishlist_added', 'Nou desitjat proposat!',
               nick || ' vol anar a provar "' || restaurant_name || '".', array[uid]
          from wishlist where id = new_id;
        n := n + 1;
      end if;
    end if;
    new_id := null;
  end loop;
  return n;
end $$;

-- Mou un ítem de l'espai personal a un grup (només el propietari).
create or replace function public.move_to_group(p_type text, p_id uuid, p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nick text;
  item_name text;
  rows_moved int;
begin
  if uid is null then raise exception 'No autenticat'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'No ets membre d''aquest grup'; end if;
  select nickname into nick from profiles where id = uid;

  if p_type = 'restaurant' then
    update restaurants set group_id = p_group_id
     where id = p_id and group_id is null and created_by = uid
    returning name into item_name;
    get diagnostics rows_moved = row_count;
    if rows_moved = 1 then
      insert into alerts (group_id, user_id, type, title, message, restaurant_id, read_by)
      values (p_group_id, uid, 'restaurant_added', 'Nou restaurant afegit!',
              nick || ' ha afegit "' || item_name || '" a la col·lecció del grup.', p_id, array[uid]);
    end if;
  elsif p_type = 'wishlist' then
    update wishlist set group_id = p_group_id
     where id = p_id and group_id is null and user_id = uid
    returning restaurant_name into item_name;
    get diagnostics rows_moved = row_count;
    if rows_moved = 1 then
      insert into alerts (group_id, user_id, type, title, message, read_by)
      values (p_group_id, uid, 'wishlist_added', 'Nou desitjat proposat!',
              nick || ' vol anar a provar "' || item_name || '".', array[uid]);
    end if;
  else
    raise exception 'Tipus invàlid';
  end if;

  if rows_moved = 0 then raise exception 'Ítem no trobat a l''espai personal'; end if;
end $$;

-- Només usuaris autenticats poden cridar les RPC.
revoke all on function public.create_group(text, text) from public, anon;
revoke all on function public.join_group_by_code(text) from public, anon;
revoke all on function public.mark_alerts_read(uuid[]) from public, anon;
revoke all on function public.copy_to_groups(text, uuid, uuid[]) from public, anon;
revoke all on function public.move_to_group(text, uuid, uuid) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.mark_alerts_read(uuid[]) to authenticated;
grant execute on function public.copy_to_groups(text, uuid, uuid[]) to authenticated;
grant execute on function public.move_to_group(text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- Realtime

alter publication supabase_realtime add table
  public.profiles, public.groups, public.group_members,
  public.restaurants, public.wishlist, public.alerts;
