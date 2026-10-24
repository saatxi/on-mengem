-- Privacitat del perfil, segon pas de 0011_security_hardening.sql: els companys de grup ja no poden llegir
-- active_group_id (UUID d'altres grups on és la persona), last_login_at (quan va obrir l'app per última vegada) ni
-- nickname_changed_at. L'app llegeix el perfil propi sencer amb get_my_profile() (security definer) des de la v1.6.1;
-- les versions anteriors feien select('*') a profiles i, amb aquesta migració, ja no carregarien el perfil.
-- Les polítiques RLS no canvien: només es limiten les columnes que es poden llegir directament.

revoke select on public.profiles from anon, authenticated;
grant select (id, nickname, avatar, photo_url, created_at) on public.profiles to authenticated;
