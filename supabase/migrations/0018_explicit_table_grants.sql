-- Privilegis explícits a les taules. Supabase deixa d'exposar automàticament les taules noves de public a la Data API
-- (anon, authenticated i service_role) el 30-10-2026 (https://github.com/orgs/supabase/discussions/45329). Les
-- migracions anteriors comptaven amb aquests privilegis per defecte i només en revocaven una part: sense aquesta
-- migració, una BD recreada des de zero (supabase db reset) deixaria authenticated sense accés a cap taula.
--
-- Es fixa l'estat final de cada taula, sigui quin sigui el de partida: primer es revoca tot (també els privilegis per
-- columna) i després es concedeixen només les operacions que tenen una política RLS. Les que no en tenen ja eren
-- denegades per RLS, així que l'app no nota cap canvi. anon perd els privilegis (cap política és per a anon) i ningú
-- conserva TRUNCATE, REFERENCES ni TRIGGER, que la Data API no fa servir (TRUNCATE, a més, no passa per RLS).

revoke all on table
  public.profiles, public.groups, public.group_members, public.restaurants, public.wishlist, public.alerts,
  public.join_attempts, public.restaurant_visits, public.visit_attendees, public.group_changes
  from anon, authenticated, service_role;

-- Contingut dels espais: les polítiques cobreixen les quatre operacions.
grant select, insert, update, delete on public.restaurants, public.wishlist to authenticated;

-- Grups: es creen amb create_group; l'owner només n'edita el nom i la descripció (el codi, amb regenerate_group_code).
grant select, delete on public.groups to authenticated;
grant update (name, description) on public.groups to authenticated;

-- Membres: s'hi entra amb RPC; un membre pot sortir i l'owner, expulsar.
grant select, delete on public.group_members to authenticated;

-- Perfils: les columnes públiques (0014) i les que edita l'usuari (0001). No s'insereixen ni s'esborren des del client.
grant select (id, nickname, avatar, photo_url, created_at) on public.profiles to authenticated;
grant update (nickname, avatar, active_group_id, last_login_at) on public.profiles to authenticated;

-- Només lectura: les escriptures passen per triggers i RPC (security definer).
grant select on public.alerts, public.restaurant_visits, public.visit_attendees, public.group_changes to authenticated;

-- join_attempts: cap accés des del client.

grant select, insert, update, delete on table
  public.profiles, public.groups, public.group_members, public.restaurants, public.wishlist, public.alerts,
  public.join_attempts, public.restaurant_visits, public.visit_attendees, public.group_changes
  to service_role;

-- Les taules i seqüències noves que creï postgres a public ja no reben privilegis per a la Data API, com als projectes
-- nous de Supabase: cada migració que creï una taula hi ha d'afegir els seus grant. Les funcions mantenen l'EXECUTE
-- per a PUBLIC de Postgres; per això cada funció ja revoca i concedeix l'EXECUTE explícitament.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
