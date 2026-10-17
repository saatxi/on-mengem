# On menjem? — instruccions per treballar al projecte

PWA en català per guardar restaurants i llistes de desitjos, amb espai personal i grups compartits (codi d'invitació de 6 caràcters, dades en temps real).

## Stack

React 19 + TypeScript, Vite 8, Tailwind 4 (`@tailwindcss/vite`), `vite-plugin-pwa`, Supabase (Google OAuth, Postgres, Realtime), `lucide-react`, `motion`, `recharts`. Node >=24 (`.nvmrc`).

## Ordres

```bash
nvm use && npm install
cp .env.example .env      # omplir VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:3000
npm run build
npm run lint              # = tsc --noEmit (no hi ha ESLint ni Prettier)
```

- No hi ha tests JS. Per verificar canvis de frontend: `npm run lint` + `npm run build`.
- Tests de la BD (pgTAP, cal Docker): `npx supabase start` i `npx supabase test db`.
- Reinicia el servidor de desenvolupament després de canviar `.env`.

## Estructura

- `src/App.tsx`: pantalla principal (pestanyes i estat dels modals).
- `src/components/`: components i modals.
- `src/context/AuthContext.tsx`: sessió, perfil, grups (`useAuth()`).
- `src/hooks/useRealtimeData.ts`: dades de l'espai actiu, Realtime i RPCs (`copyToGroups`, `moveToGroup`…).
- `src/supabase/client.ts` i `mappers.ts`: client i conversió fila BD ↔ tipus de l'app.
- `src/types/index.ts`: tipus compartits.
- `supabase/migrations/0001_init.sql`: esquema, RLS i funcions.
- `supabase/tests/rls.test.sql`: tests de seguretat.
- `docs/CONFIGURACIO.md` (guia de configuració) i `docs/SEGURETAT.md` (especificació de seguretat).

## Convencions de codi

- Text d'UI, errors, comentaris i documentació **en català**; identificadors (components, funcions, tipus, fitxers) **en anglès**.
- Components: funcions `React.FC<Props>` amb `interface Props` local i export nomenat (sense `default`). Fitxers en PascalCase.
- Hooks: `useXxx`, export nomenat, netegen listeners i subscripcions al `return` de l'`useEffect`.
- Estils amb classes Tailwind inline; icones de `lucide-react`; color d'accent `#ea580c`.
- Imports relatius (l'àlies `@/` existeix però no s'usa).
- Respecta `.editorconfig` (UTF-8, LF, final de línia); imita l'estil dels fitxers veïns (cometes simples, punt i coma).

## Regles de domini i seguretat

- RLS és el límit de seguretat. Si canvies una política, funció o trigger, actualitza `supabase/tests/rls.test.sql` i `docs/SEGURETAT.md` al mateix commit.
- Mai `service_role` ni claus `sb_secret_` al client; només la clau pública (anon).
- Files de BD en snake_case, tipus de l'app en camelCase: una columna nova implica actualitzar `mappers.ts` i `types/index.ts`.
- `groupId: null` / `group_id IS NULL` vol dir espai personal.
- Si canvia la configuració o l'arrencada, actualitza `README.md` i `docs/CONFIGURACIO.md`.

## Estil de commits

Derivat de l'historial del repositori:

- Missatge **en anglès**, encara que codi, UI i docs siguin en català.
- Assumpte en **imperatiu amb majúscula inicial** (Add, Update, Remove, Fix…), sense punt final, d'uns 40–70 caràcters.
- **Sense prefixos** tipus conventional commits (`feat:`, `fix:`) ni àmbits.
- Commits amb substància: línia en blanc i cos amb **llista de guions**; cada punt, una frase declarativa curta amb majúscula inicial que explica què i per què. Commits trivials: només assumpte.
- Un commit per canvi lògic (p. ex. esquema + polítiques + tests junts; docs junts).
- La feina va a `devel` i s'integra a `main`.

Exemples reals:

```
Add Supabase schema, security policies and tests
Add personal space, group sharing and PWA install guide
Update reference to security documentation in RLS test
```

```
Add project setup with Vite, React, Tailwind and Supabase

- Vite 8 + React 19 + Tailwind 4 + PWA plugin, written in TypeScript
- Require Node 24 (engines field and .nvmrc)
- Add .env.example with the Supabase URL and public key variables
```

## Peculiaritats conegudes

- L'script `clean` esmenta `server.js`, residu de l'antic Express.
- `tsconfig.json` no té `strict` activat.
