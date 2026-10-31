-- Reaccions amb emoji dels membres d'un grup als restaurants, desitjats i visites del grup. Una reacció apunta a un
-- sol ítem amb una FK pròpia (esborrar l'ítem, el grup o el compte n'esborra les reaccions) i la llista d'emojis és
-- tancada. A l'espai personal no n'hi ha.

create table public.reactions (
    id uuid default gen_random_uuid() not null primary key,
    group_id uuid not null references public.groups(id) on delete cascade,
    user_id uuid default auth.uid() not null references public.profiles(id) on delete cascade,
    restaurant_id uuid references public.restaurants(id) on delete cascade,
    wishlist_id uuid references public.wishlist(id) on delete cascade,
    visit_id uuid references public.restaurant_visits(id) on delete cascade,
    emoji text not null,
    created_at timestamp with time zone default now() not null,
    constraint reactions_one_target check ((num_nonnulls(restaurant_id, wishlist_id, visit_id) = 1)),
    -- 👍 👎 ❤️ (amb el selector de variació U+FE0F) 🤤 🙋
    constraint reactions_emoji_check check ((emoji = any (array['👍', '👎', '❤️', '🤤', '🙋'])))
);

-- Una reacció de cada emoji per persona i ítem: reaccionar és idempotent i el volum queda acotat
-- (membres × 5 per ítem), sense cap quota addicional.
create unique index reactions_restaurant_unique on public.reactions (restaurant_id, user_id, emoji) where restaurant_id is not null;
create unique index reactions_wishlist_unique on public.reactions (wishlist_id, user_id, emoji) where wishlist_id is not null;
create unique index reactions_visit_unique on public.reactions (visit_id, user_id, emoji) where visit_id is not null;
create index reactions_group_id_idx on public.reactions (group_id);
create index reactions_user_id_idx on public.reactions (user_id);

-- ---------------------------------------------------------------- Triggers

-- El grup surt de l'ítem, no del client. Un ítem personal, inexistent o d'un grup aliè donen el mateix error, perquè
-- l'error no reveli si un id existeix.
create function public.set_reaction_group() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  gid uuid;
begin
  if new.restaurant_id is not null then
    select group_id into gid from public.restaurants where id = new.restaurant_id;
  elsif new.wishlist_id is not null then
    select group_id into gid from public.wishlist where id = new.wishlist_id;
  elsif new.visit_id is not null then
    select group_id into gid from public.restaurant_visits where id = new.visit_id;
  end if;
  if gid is null or not public.is_group_member(gid) then
    raise exception 'Només es pot reaccionar als ítems d''un grup on ets membre';
  end if;
  new.group_id := gid;
  return new;
end $$;

create trigger reactions_set_group before insert on public.reactions
  for each row execute function public.set_reaction_group();

-- Qui surt o és expulsat d'un grup hi perd les reaccions: la resta ja no en podria veure el nom (profiles_select).
create function public.remove_member_reactions() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  delete from public.reactions where group_id = old.group_id and user_id = old.user_id;
  return old;
end $$;

create trigger group_members_remove_reactions after delete on public.group_members
  for each row execute function public.remove_member_reactions();

-- Realtime: avís al canal group:<id> (change_topics ja hi porta les files amb group_id).
create trigger reactions_broadcast_insert after insert on public.reactions
  referencing new table as new_rows for each statement execute function public.broadcast_changes();
create trigger reactions_broadcast_delete after delete on public.reactions
  referencing old table as old_rows for each statement execute function public.broadcast_changes();

-- ---------------------------------------------------------------- Conversió de desitjats

-- Mateix cos que a 0002: abans d'esborrar el desitjat, en passa les reaccions al restaurant nou.
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

  insert into public.reactions (user_id, restaurant_id, emoji, created_at)
  select r.user_id, rid, r.emoji, r.created_at from public.reactions r where r.wishlist_id = w.id
  on conflict do nothing;

  perform set_config('onmenjem.converting_wishlist', w.id::text, true);
  delete from public.wishlist where id = w.id;
  perform set_config('onmenjem.converting_wishlist', '', true);
  return rid;
end $$;

-- ---------------------------------------------------------------- RLS i privilegis

alter table public.reactions enable row level security;

create policy reactions_select on public.reactions for select to authenticated using (public.is_group_member(group_id));
-- with check s'avalua després del trigger before insert, que ja ha fixat group_id.
create policy reactions_insert on public.reactions for insert to authenticated
  with check ((user_id = auth.uid()) and public.is_group_member(group_id));
create policy reactions_delete on public.reactions for delete to authenticated using ((user_id = auth.uid()));

-- Sense update: canviar d'emoji és treure'n un i posar-ne un altre. En una alta, el client només tria l'ítem i
-- l'emoji: user_id surt del valor per defecte (auth.uid()) i group_id, del trigger.
grant select, delete on public.reactions to authenticated;
grant insert (restaurant_id, wishlist_id, visit_id, emoji) on public.reactions to authenticated;
grant select, insert, update, delete on public.reactions to service_role;

revoke all on function public.set_reaction_group() from public, anon, authenticated;
revoke all on function public.remove_member_reactions() from public, anon, authenticated;
