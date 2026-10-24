# Millores pendents

Llista de millores detectades a la revisió general del codi (octubre de 2026) que encara no s'han fet. Cada punt indica el problema, la proposta, la prioritat i una estimació d'esforç (S: unes hores, M: un o dos dies, L: més).

Quan en facis una, treu-la d'aquí al mateix commit.

## Vista de mapa dels restaurants

- **Problema:** les adreces només s'obren d'una en una a Google Maps; no es veu on queden els restaurants entre ells.
- **Proposta:** afegir una vista de mapa a la pestanya de restaurants (p. ex. Leaflet amb tiles d'OpenStreetMap), geocodificant l'adreça en desar-la i guardant-ne les coordenades en una columna nova.
- **Cal tenir en compte:** migració nova per a les coordenades, autoritzar el domini dels tiles a la Content-Security-Policy de `vite.config.ts` i decidir el servei de geocodificació (límits d'ús i privacitat).
- **Prioritat:** baixa. **Esforç:** L.

## Realtime amb Broadcast privat per grup

- **Problema:** Supabase no aplica RLS als events `DELETE` de `postgres_changes` i els envia a tothom amb la clau primària. Qualsevol usuari autenticat veu, per exemple, quins usuaris surten de quins grups (UUID). El client ja ignora els que no l'afecten, però continuen arribant.
- **Proposta:** substituir `postgres_changes` per Broadcast des de la BD (`realtime.broadcast_changes` en triggers) a canals privats (`group:<id>`, `user:<id>`), autoritzats amb polítiques RLS a `realtime.messages`.
- **Cal tenir en compte:** canvia `useRealtimeData.ts`, `useGroupHistory.ts` i `AuthContext.tsx`, cal treure les taules de la publicació `supabase_realtime` i afegir tests de les polítiques de `realtime.messages`.
- **Prioritat:** mitjana. **Esforç:** M.
