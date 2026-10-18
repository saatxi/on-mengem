# On menjem?

PWA en català per guardar restaurants i llistes de desitjats en un **espai personal** i compartir-los amb **grups** mitjançant un codi d'invitació. Els canvis dels grups es veuen en temps real.

**Tecnologia:** React 19, TypeScript, Vite, Tailwind 4, PWA, i Supabase (inici de sessió amb Google, Postgres i Realtime).

## Com funciona

- En entrar per primer cop només es crea el perfil. **No** es crea cap grup ni dada d'exemple.
- L'**espai personal** és privat: només el veus tu.
- Pots **crear un grup** o **unir-te'n** a un amb el seu codi de 6 caràcters, i canviar d'espai des del selector de la barra superior.
- Des de qualsevol restaurant o desitjat de l'espai personal pots **copiar-lo** a un o varis grups, o **moure'l** a un grup.
- Dins d'un grup hi ha una activitat amb alertes (restaurants i desitjats afegits, nous membres) i un gràfic de cuines.
- La seguretat es fa amb Row Level Security a Postgres (vegeu [docs/SEGURETAT.md](docs/SEGURETAT.md)).

## Posada en marxa

Cal Node 24 (`nvm use` llegeix `.nvmrc`), un projecte gratuït de [Supabase](https://supabase.com) i un client OAuth de Google. La guia pas a pas és a **[docs/CONFIGURACIO.md](docs/CONFIGURACIO.md)**. En resum:

1. Crea el projecte a Supabase i aplica les migracions de [supabase/migrations/](supabase/migrations/) amb `supabase db push` (o executa-les en ordre a l'*SQL Editor*).
2. Activa el proveïdor de Google (Client ID i Secret de Google Cloud) i configura les URL de redirecció.
3. `cp .env.example .env` i omple `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.
4. `npm install && npm run dev`, i obre `http://localhost:3000`.

> El pla gratuït de Supabase pausa el projecte després d'~1 setmana sense activitat; es reactiva des del panell.

## Scripts

| Comanda | Què fa |
|---|---|
| `npm run dev` | Servidor de desenvolupament al port 3000 |
| `npm run build` | Build de producció a `dist/` |
| `npm run preview` | Serveix la build en local |
| `npm run lint` | Comprova els tipus (`tsc --noEmit`) |
| `npx supabase test db` | Tests de seguretat de la base de dades (cal Docker i `npx supabase start`) |
| `npm version <x.y.z>` | Puja la versió, obre l'editor de git per escriure el missatge del commit (proposa `Release x.y.z`) i crea l'etiqueta `vx.y.z` (també: `make release patch|minor|major|x.y.z`) |

## Estructura

```
src/
  App.tsx              Pantalla principal i pestanyes
  components/          Modals, barra superior, gràfic, instal·lació PWA
  context/             AuthContext: sessió, perfil i grups
  hooks/               useRealtimeData (dades de l'espai actiu), PWA i connexió
  supabase/            Client i conversió entre files de la BD i tipus de l'app
supabase/
  migrations/          Esquema, polítiques RLS i funcions
  tests/               Tests pgTAP de seguretat
docs/                  Guia de configuració i especificació de seguretat
```

## Publicar

L'app es publica a Cloudflare Workers amb fitxers estàtics (`wrangler.jsonc`): cada push a `main` executa `npm run build` i `npx wrangler deploy`. Les variables `VITE_SUPABASE_*` s'han de definir com a variables de build del Worker. Després afegeix la URL final a les *Redirect URLs* de Supabase (vegeu [docs/CONFIGURACIO.md](docs/CONFIGURACIO.md)).

## Publicar una versió

Des de `devel`, amb l'arbre net:

```bash
npm version minor -m "Release %s"   # o patch / major: actualitza package.json, crea commit i tag vX.Y.Z
git push --follow-tags
```

La versió de `package.json` es mostra a l'app (modal del perfil). Després integra `devel` a `main`.

## Instal·lar l'app al mòbil (PWA)

Cal obrir l'adreça de l'app (HTTPS) des del navegador del mòbil.

**Android (Chrome)**
1. Toca el botó *Instal·la App* de la barra superior, o bé el menú **⋮** → *Instal·la l'aplicació* / *Afegeix a la pantalla d'inici*.
2. Confirma amb *Instal·la*.

**iPhone / iPad (només Safari)**
1. Toca **Compartir** (quadrat amb fletxa cap amunt).
2. *Afegeix a la pantalla d'inici* → *Afegeix*.

L'app s'obrirà a pantalla completa, com una app nativa.
