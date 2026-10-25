-- Les polítiques d'esborrat de 0001 deixaven esborrar a l'autor sense comprovar que l'ítem fos del seu espai personal
-- o que encara fos membre del grup. La política de lectura no fa de barrera en un DELETE sense WHERE ni RETURNING:
-- un membre que havia sortit del grup o n'havia estat expulsat podia esborrar tot el que hi havia afegit.
-- Ara la branca de l'autor demana el mateix que select, insert i update.

alter policy restaurants_delete on public.restaurants
  using ((created_by = auth.uid() and (group_id is null or public.is_group_member(group_id)))
      or (group_id is not null and public.is_group_owner(group_id)));

alter policy wishlist_delete on public.wishlist
  using ((user_id = auth.uid() and (group_id is null or public.is_group_member(group_id)))
      or (group_id is not null and public.is_group_owner(group_id)));
