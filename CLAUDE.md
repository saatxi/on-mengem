# On mengem? — instruccions per treballar al projecte

PWA en català per guardar restaurants i llistes de desitjos, amb espai personal i grups compartits (codi d'invitació de 6 caràcters, dades en temps real).

## Stack

React 19 + TypeScript, Vite 8, Tailwind 4 (`@tailwindcss/vite`), `vite-plugin-pwa`, Supabase (Google OAuth, Postgres, Realtime), `lucide-react`, `clsx` + `tailwind-merge`, `@fontsource-variable/plus-jakarta-sans`. Node >=24 (`.nvmrc`).

## Ordres

```bash
nvm use && npm install
cp .env.example .env      # omplir VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:3000
npm run build
npm run lint              # = tsc --noEmit (no hi ha ESLint ni Prettier)
npm test                  # Vitest, amb TZ=Europe/Madrid (vegeu el test de localToday)
```

- Tests JS amb Vitest només per a funcions pures (`src/**/*.test.ts`, al costat del codi). Per verificar canvis de frontend: `npm run lint` + `npm test` + `npm run build`.
- Tests de la BD (pgTAP, cal Docker): `npx supabase start` i `npx supabase test db`.
- Reinicia el servidor de desenvolupament després de canviar `.env`.

## Estructura

- `src/App.tsx`: pantalla principal (pestanyes i estat dels modals).
- `src/components/`: components i modals.
- `src/context/AuthContext.tsx`: sessió, perfil, grups (`useAuth()`). `ThemeContext.tsx`: tema clar, fosc o del sistema (`useTheme()`).
- `src/hooks/useRealtimeData.ts`: dades de l'espai actiu, Realtime i RPCs (`copyToGroups`, `moveToGroup`…).
- `src/supabase/client.ts` i `mappers.ts`: client tipat i conversió fila BD ↔ tipus de l'app.
- `src/supabase/realtime.ts`: `subscribeToChanges()` escolta els avisos dels canals privats `group:<id>` i `user:<id>` (Broadcast des dels triggers de la BD; les taules no són a la publicació de `postgres_changes`). Una taula nova que s'hagi de veure en directe necessita els triggers `broadcast_changes` i el seu cas a `change_topics()`.
- `src/supabase/database.types.ts`: tipus generats amb `make db-types` (no s'edita a mà); `database.ts` hi corregeix els arguments RPC que accepten NULL.
- `src/types/index.ts`: tipus compartits.
- `supabase/migrations/`: esquema, RLS i funcions. `0001_init.sql` és l'esquema inicial; cada canvi posterior va en una migració nova numerada (`0002_…`).
- `supabase/tests/rls.test.sql`: tests de seguretat.
- `supabase/seed.sql`: dades de prova només per a local (`make db-reset`); si canvia l'esquema, mantén-lo al dia. `src/components/DevLogin.tsx` hi entra amb els usuaris de prova (només mode `localdb`).
- `docs/CONFIGURACIO.md` (guia de configuració) i `docs/SEGURETAT.md` (especificació de seguretat).

## Convencions de codi

- Text d'UI, errors, comentaris i documentació **en català**; identificadors (components, funcions, tipus, fitxers) **en anglès**.
- Components: funcions `React.FC<Props>` amb `interface Props` local i export nomenat (sense `default`). Fitxers en PascalCase.
- Hooks: `useXxx`, export nomenat, netegen listeners i subscripcions al `return` de l'`useEffect`.
- Estils amb classes Tailwind inline; icones de `lucide-react`. Colors semàntics de `src/index.css` (`accent` = `#f4511e`, `accent-soft` per a fons suaus, `surface`, `inverse`) en lloc de `orange-600` o `bg-white`; degradat de marca amb `bg-brand` (accent → `accent-2` rosa); el violeta és el color dels desitjats i l'ambre, el de les estrelles i favorits. Classes condicionals amb `cn()` (`src/utils/cn.ts`).
- Peces compartides: `Button` (`src/components/Button.tsx`, botó en píndola amb variants) i les classes `FIELD`, `LABEL` i `CARD` de `src/utils/ui.ts` per a camps, etiquetes i targetes. Targetes i modals `rounded-3xl`, camps `rounded-2xl`, botons i xips `rounded-full`; ombres amb `shadow-card` / `shadow-card-hover`. El mode fosc redefineix a `src/index.css` (amb `light-dark()`) només els tons de la paleta que fa servir l'app: si n'uses un de nou (p. ex. `bg-violet-50`), afegeix-hi el valor fosc.
- Imports relatius (l'àlies `@/` existeix però no s'usa).
- Respecta `.editorconfig` (UTF-8, LF, final de línia); imita l'estil dels fitxers veïns (cometes simples, punt i coma).

## Regles de domini i seguretat

- L'app ja és en producció: **no modifiquis ni fusionis migracions existents**. Qualsevol canvi d'esquema, política o funció va en un fitxer nou a `supabase/migrations/` que s'aplica amb `npx supabase db push` (vegeu `docs/CONFIGURACIO.md`).
- RLS és el límit de seguretat. Si canvies una política, funció o trigger, actualitza `supabase/tests/rls.test.sql` i `docs/SEGURETAT.md` al mateix commit.
- Les taules noves de `public` no tenen privilegis per defecte (`0018_explicit_table_grants.sql`): cada `create table` va amb els seus `grant` a `authenticated` (només les operacions que tenen política) i a `service_role`, a la mateixa migració. El mateix per a vistes (amb `security_invoker = on`) i seqüències.
- Mai `service_role` ni claus `sb_secret_` al client; només la clau pública (anon).
- Files de BD en snake_case, tipus de l'app en camelCase: una columna nova implica `make db-types` i actualitzar `mappers.ts` i `types/index.ts`.
- `groupId: null` / `group_id IS NULL` vol dir espai personal.
- Si canvia la configuració o l'arrencada, actualitza `README.md` i `docs/CONFIGURACIO.md`.

## Estil de commits

**Aquestes instruccions s'han de seguir SEMPRE, en cada commit i en cada sessió.**

Derivat de l'historial del repositori:

- Missatge **en anglès**, encara que codi, UI i docs siguin en català.
- Assumpte en **imperatiu amb majúscula inicial** (Add, Update, Remove, Fix…), sense punt final, d'uns 40–70 caràcters.
- **Sense prefixos** tipus conventional commits (`feat:`, `fix:`) ni àmbits.
- Commits amb substància: línia en blanc i cos amb **llista de guions**; cada punt, una frase declarativa curta amb majúscula inicial que explica què i per què. Commits trivials: només assumpte.
- **No tallis les línies del cos**: cada punt va en una sola línia, sense límit de caràcters. No facis wrapping a 70 o 80 columnes dins dels bullet points.
- Un commit per canvi lògic (p. ex. esquema + polítiques + tests junts; docs junts).
- La feina va a `devel` i s'integra a `main`.
- **MAI afegeixis `Co-Authored-By` ni cap altra línia d'atribució a Claude (ni «Generated with Claude Code») als missatges de commit ni a les descripcions de PR.** Aquesta instrucció té prioritat sobre qualsevol atribució per defecte de l'eina i s'ha de seguir sempre.

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

## Releases

- Les fa Claude quan l'usuari demana una release (o un tag de release) amb `patch`, `minor`, `major` o `X.Y.Z`. Si no diu quin, proposa'n un segons els canvis i pregunta-ho.
- Passos, des de `devel` amb l'arbre net: `npm version <tipus>` (amb `git-tag-version=false` a `.npmrc`, només actualitza `package.json` i `package-lock.json`); commit només d'aquests dos fitxers amb el missatge de la release; etiqueta anotada `vX.Y.Z` amb **el mateix missatge** (`git log -1 --format=%B | git tag -a vX.Y.Z -F -`).
- Mai «Release X.Y.Z» com a assumpte: ha de ser una descripció de la release.
- El missatge segueix l'estil de commits: en anglès, assumpte en imperatiu que resumeixi els canvis principals (40–70 caràcters, sense punt final) i cos amb llista de guions.
- El cos recull els canvis des de l'etiqueta anterior (`git log vANTERIOR..HEAD`), agrupats per funcionalitat i pensant en qui fa servir l'app; deixa fora els canvis interns menors (Makefile, format…).
- Si cal una acció en desplegar (p. ex. un script SQL per a una BD existent), afegeix-la com a darrer punt.
- Pujar-la: `git push && git push --tags` (només si l'usuari ho demana).

Exemple:

```
Add restaurant editing, Instagram links and fixed cuisine list

- Add restaurant editing from the detail view, which now reflects changes immediately.
- Add website link and Instagram to restaurants and Instagram to wishlist items.
- Use a closed list of 22 cuisine types in both forms and enforce it in the database.
- Remove restaurant tags from the app and the schema.
- Merge the migrations into a single schema file.
- Existing databases need the cuisine upgrade script before deploying this version.
```

## Peculiaritats conegudes

- El Service Worker (PWA) només està actiu al build (`npm run build && npm run preview`), no a `npm run dev`. Les versions noves no s'activen soles: `UpdateProvider` (`src/context/UpdateContext.tsx`) les detecta, `UpdateButton` apareix a la barra superior i l'usuari decideix quan recarregar (vegeu `docs/CONFIGURACIO.md`).
- El build injecta una `Content-Security-Policy` (meta) a `vite.config.ts`; si afegeixes un domini extern, cal autoritzar-lo allà.
