-- Privacitat del perfil: profiles.email era visible per a tots els companys de grup (i per Realtime).
-- L'app només mostra el correu propi, que ja ve de la sessió d'Auth, així que la columna s'elimina.
-- A més, sync_nickname_to_records també actualitza groups.owner_name quan canvia el nickname.

alter table public.profiles drop column if exists email;

-- Igual que a 0001_init.sql, però sense desar l'email al perfil.
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

  insert into public.profiles (id, nickname, avatar, photo_url)
  values (
    new.id,
    left(nick, 50),
    avatars[1 + floor(random() * array_length(avatars, 1))::int],
    photo
  );
  return new;
end $$;

-- Igual que a 0007, i a més manté al dia el nom de l'owner dels grups.
create or replace function public.sync_nickname_to_records()
returns trigger language plpgsql security definer set search_path = '' as $$
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
