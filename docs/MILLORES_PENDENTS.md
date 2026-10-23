# Millores pendents

Llista de millores detectades a la revisió general del codi (octubre de 2026) que encara no s'han fet. Cada punt indica el problema, la proposta, la prioritat i una estimació d'esforç (S: unes hores, M: un o dos dies, L: més).

Quan en facis una, treu-la d'aquí al mateix commit.

## Vista de mapa dels restaurants

- **Problema:** les adreces només s'obren d'una en una a Google Maps; no es veu on queden els restaurants entre ells.
- **Proposta:** afegir una vista de mapa a la pestanya de restaurants (p. ex. Leaflet amb tiles d'OpenStreetMap), geocodificant l'adreça en desar-la i guardant-ne les coordenades en una columna nova.
- **Cal tenir en compte:** migració nova per a les coordenades, autoritzar el domini dels tiles a la Content-Security-Policy de `vite.config.ts` i decidir el servei de geocodificació (límits d'ús i privacitat).
- **Prioritat:** baixa. **Esforç:** L.

## Icones de l'app amb els colors nous

- **Problema:** les icones de la PWA (`public/icon.svg`, `pwa-*.png`, `apple-touch-icon.png`, `favicon.ico`) encara fan servir el degradat taronja antic (`#EA580C` → `#FB923C`), mentre que la interfície ara usa l'accent `#f4511e` i el degradat de marca cap al rosa (`#ec4899`).
- **Proposta:** actualitzar el degradat de `public/icon.svg` i regenerar-ne els PNG i el favicon.
- **Prioritat:** baixa. **Esforç:** S.
