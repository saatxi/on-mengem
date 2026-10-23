# Millores pendents

Llista de millores detectades a la revisió general del codi (octubre de 2026) que encara no s'han fet. Cada punt indica el problema, la proposta, la prioritat i una estimació d'esforç (S: unes hores, M: un o dos dies, L: més).

Quan en facis una, treu-la d'aquí al mateix commit.

## Vista de mapa dels restaurants

- **Problema:** les adreces només s'obren d'una en una a Google Maps; no es veu on queden els restaurants entre ells.
- **Proposta:** afegir una vista de mapa a la pestanya de restaurants (p. ex. Leaflet amb tiles d'OpenStreetMap), geocodificant l'adreça en desar-la i guardant-ne les coordenades en una columna nova.
- **Cal tenir en compte:** migració nova per a les coordenades, autoritzar el domini dels tiles a la Content-Security-Policy de `vite.config.ts` i decidir el servei de geocodificació (límits d'ús i privacitat).
- **Prioritat:** baixa. **Esforç:** L.

## Amagar l'espai actiu i l'últim accés als companys de grup

- **Problema:** `profiles_select` deixa que els companys de grup llegeixin `active_group_id` (UUID d'altres grups on és la persona) i `last_login_at` (quan va obrir l'app per última vegada).
- **Proposta:** des de la versió que inclou la migració `0011`, l'app llegeix el perfil propi amb `get_my_profile()`. Quan les instal·lacions antigues s'hagin actualitzat, una migració nova ha de fer `revoke select on public.profiles from anon, authenticated` i `grant select (id, nickname, avatar, photo_url, created_at) on public.profiles to authenticated`, amb tests que comprovin que un company no pot llegir `last_login_at` ni `active_group_id`.
- **Cal tenir en compte:** abans d'aplicar-la, les versions anteriors fan `select('*')` a `profiles` i deixarien de carregar el perfil. S'ha comprovat en local que el Realtime del perfil propi (filtre `id=eq.<uid>`) continua funcionant amb els privilegis per columna.
- **Prioritat:** baixa. **Esforç:** S.

## Realtime amb Broadcast privat per grup

- **Problema:** Supabase no aplica RLS als events `DELETE` de `postgres_changes` i els envia a tothom amb la clau primària. Qualsevol usuari autenticat veu, per exemple, quins usuaris surten de quins grups (UUID). El client ja ignora els que no l'afecten, però continuen arribant.
- **Proposta:** substituir `postgres_changes` per Broadcast des de la BD (`realtime.broadcast_changes` en triggers) a canals privats (`group:<id>`, `user:<id>`), autoritzats amb polítiques RLS a `realtime.messages`.
- **Cal tenir en compte:** canvia `useRealtimeData.ts` i `AuthContext.tsx`, cal treure les taules de la publicació `supabase_realtime` i afegir tests de les polítiques de `realtime.messages`.
- **Prioritat:** mitjana. **Esforç:** M.

## Historial de canvis dels grups

- **Problema:** qualsevol membre pot editar tots els camps dels restaurants i desitjats del grup i esborrar visites grupals, i no hi ha manera de veure-ho ni de desfer-ho.
- **Proposta:** una taula d'auditoria (qui, quan, valors anteriors) omplerta per triggers, visible per als membres i amb opció de restaurar.
- **Prioritat:** baixa. **Esforç:** M.
