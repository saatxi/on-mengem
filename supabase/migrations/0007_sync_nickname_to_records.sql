-- Quan el nickname d'un perfil canvia, actualitza el nom als registres existents
-- (restaurants, restaurant_visits) que tenen el nom desnormalitzat.
-- El trigger s'executa com a SECURITY DEFINER per evitar la restricció d'immutabilitat per a clients.

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
  end if;
  return new;
end $$;

create trigger profiles_sync_nickname
  after update of nickname on public.profiles
  for each row execute function public.sync_nickname_to_records();
