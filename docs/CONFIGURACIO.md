# Configuració inicial del projecte

Guia pas a pas per posar en marxa **On mengem?** amb Supabase (base de dades + Realtime) i Google (inici de sessió).

Requisits: Node 24 (`nvm use`, llegeix `.nvmrc`), un compte de [Supabase](https://supabase.com) i un compte de Google.

Ordre recomanat: **A → B → C → D → E**. Cal anar i tornar entre Supabase i Google, perquè cadascun et dona una dada que l'altre necessita:

- Supabase et dona la *Callback URL*, que va a Google.
- Google et dona el *Client ID* i el *Client Secret*, que van a Supabase.

---

## A. Crear el projecte a Supabase i copiar la Callback URL

1. Entra a [supabase.com](https://supabase.com), inicia sessió i prem **New project**.
2. Posa un nom (per exemple `on-mengem`), una contrasenya de base de dades (guarda-la) i la regió més propera (per exemple *West EU*). Prem **Create**. Tarda un parell de minuts.
3. Quan estigui llest, aplica les migracions amb la CLI de Supabase (vegeu [Migracions amb la CLI de Supabase](#migracions-amb-la-cli-de-supabase)).
4. Ves a **Authentication → Sign In / Providers** i obre **Google**.
5. Copia el camp **Callback URL (for OAuth)**. Té aquest aspecte: `https://abcdefgh.supabase.co/auth/v1/callback`.
6. Deixa aquesta pestanya oberta.

## B. Crear les credencials a Google Cloud

### B1. Projecte
1. Entra a [console.cloud.google.com](https://console.cloud.google.com) amb el teu compte de Google.
2. A dalt a l'esquerra, prem el selector de projecte → **New project**.
3. Nom: `On mengem` → **Create**. Comprova que queda seleccionat al selector.

### B2. Pantalla de consentiment
És la pantalla on Google pregunta a l'usuari si deixa entrar l'app.

1. Menú ☰ → **APIs & Services → OAuth consent screen** (en versions noves: **Google Auth Platform**). Prem **Get started** si és la primera vegada.
2. **App information:** nom `On mengem?` i el teu correu d'assistència.
3. **Audience:** tria **External**.
4. **Contact information:** el teu correu.
5. Accepta les condicions i prem **Create**.
6. No cal afegir cap *scope*. `email`, `profile` i `openid` ja hi són per defecte i no requereixen verificació.
7. L'app queda en mode **Testing**. Mentre hi sigui, **només poden entrar els correus afegits a "Test users"**. A **Audience → Test users → Add users** afegeix el teu correu i el dels teus amics.
8. Quan vulguis que entri tothom, prem **Publish app** (passa a *In production*).

### B3. Crear el client OAuth
1. **APIs & Services → Credentials** (o **Google Auth Platform → Clients**).
2. **Create credentials → OAuth client ID** (o **Create client**).
3. **Application type:** `Web application`.
4. **Name:** `On mengem web`.
5. **Authorized JavaScript origins** (opcional): `http://localhost:3000` i, quan la tinguis, la URL de producció.
6. **Authorized redirect URIs → Add URI:** enganxa **exactament** la Callback URL de Supabase (pas A5), sense espais ni barra final.
7. Prem **Create**.
8. Copia el **Client ID** (acaba en `.apps.googleusercontent.com`) i el **Client secret**. El secret el pots tornar a veure més tard a la llista de clients.

## C. Enganxar les credencials a Supabase

1. Supabase → **Authentication → Sign In / Providers → Google**.
2. Activa **Enable Sign in with Google**.
3. Enganxa el **Client ID** i el **Client Secret**.
4. Deixa **Skip nonce check** desactivat.
5. Prem **Save**.

## D. Dir a Supabase on pot tornar l'usuari

1. **Authentication → URL Configuration**.
2. **Site URL:** la URL de producció. Si encara no en tens, posa `http://localhost:3000`.
3. **Redirect URLs:** afegeix `http://localhost:3000` i la URL de producció quan la tinguis.
4. Prem **Save**.

## E. Connectar l'app

### E1. On són la URL i la clau

1. A Supabase, **Project Settings** (la roda dentada, a baix a l'esquerra) → **API Keys** (segons la versió, també pot dir-se **API** o **Data API**).
2. Copia la clau pública. Hi ha dos formats i tots dos serveixen:
   - **Publishable** (`sb_publishable_...`), a la pestanya *Publishable and secret API keys*.
   - **anon** (`eyJ...`), a la pestanya *Legacy anon, service_role API keys*.
3. **No copiïs mai** la clau **secret** (`sb_secret_...`) ni la **service_role**. Salten la seguretat de les polítiques RLS i no han d'estar mai al navegador.
4. La URL del projecte és `https://<projecte>.supabase.co`. La pantalla *Integrations → Data API* mostra la mateixa amb `/rest/v1/` al final: **treu aquest final**, perquè amb ell el client no funciona.

### E2. Fitxer `.env`

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://<projecte>.supabase.co
VITE_SUPABASE_ANON_KEY=<la clau publishable o anon>
```

`.env` és a `.gitignore` i no es puja al repositori.

### E3. Arrencar

```bash
nvm use
npm install
npm run dev
```

Obre `http://localhost:3000` i prem **Continua amb Google**. Si has de canviar el `.env`, reinicia `npm run dev`.

---

## Migracions amb la CLI de Supabase

L'esquema de la base de dades es gestiona amb la CLI de Supabase. No cal instal·lar-la: s'executa amb `npx supabase` (com fa el `Makefile`). Els fitxers de [supabase/migrations/](../supabase/migrations/) s'apliquen en ordre i la CLI recorda quins ja s'han aplicat a cada projecte.

### Enllaçar el projecte (un sol cop per ordinador)

**1. Inicia sessió:**
```bash
npx supabase login
```
S'obrirà el navegador per autenticar-te. Un cop fet, la CLI guardarà el token localment.

**2. Obtén el `project-ref`:**

Ves a **Dashboard → Project Settings → General**. El `project-ref` és la cadena de la URL: `supabase.com/dashboard/project/**abcdefghijklmnop**`.

**3. Enllaça el projecte:**
```bash
npx supabase link --project-ref <project-ref>
```
Et demanarà la contrasenya de la base de dades (la que vas posar en crear el projecte). Si no la recordes, la pots restablir a **Project Settings → Database → Reset database password**.

**4. Comprova l'estat de les migracions:**
```bash
npx supabase migration list --linked
```
Mostra cada migració amb una columna *Local* i una *Remote*. Si una migració només té valor a *Local*, encara no s'ha aplicat a producció.

### Aplicar les migracions

```bash
npx supabase db push --dry-run   # mostra què aplicaria, sense tocar res
npx supabase db push
```
Aplica els fitxers de `supabase/migrations/` que encara no s'han executat al projecte remot. En un projecte nou, les aplica totes.

### Afegir una migració nova

L'app ja és en producció: **no modifiquis mai una migració que ja s'ha aplicat**. Cada canvi d'esquema, política o funció va en un fitxer nou.

1. Crea `supabase/migrations/000N_descripcio.sql` amb el número següent.
2. Prova-la en local: `make db-reset` (torna a aplicar totes les migracions; esborra les dades locals) i `make db-test`.
3. Si canvia l'esquema o la signatura d'una funció, regenera els tipus amb `make db-types` i comprova'ls amb `npm run lint`: `src/supabase/database.types.ts` no s'edita a mà.
4. Aplica-la a producció amb `npx supabase db push` **abans** de passar a `main` el codi que la necessita, perquè cada push a `main` publica l'app.

### Si la base de dades es va crear amb el SQL Editor

Si vas executar les migracions enganxant-les al SQL Editor, la CLI no sap que ja hi són i `db push` les intentaria tornar a aplicar. Marca-les com a aplicades un sol cop, abans del primer `db push`:
```bash
npx supabase migration repair --status applied 0001
```
Repeteix-ho amb cada migració que ja hagis executat a mà (`0002`, …) i comprova-ho amb `npx supabase migration list --linked`.

### Migracions consolidades

Les migracions `0001`–`0024` es van consolidar en `0001_schema.sql` (un `pg_dump` de l'esquema de producció). Les originals, amb l'origen de cada mesura que cita `docs/SEGURETAT.md`, són a l'historial de git (`git show 9c7ffb0:supabase/migrations/<fitxer>`). Una BD que ja tenia les 24 migracions aplicades no necessita res més que deixar-ne una sola al registre:

```sql
delete from supabase_migrations.schema_migrations;
```
```bash
npx supabase migration repair --status applied 0001
npx supabase db push --dry-run   # ha de dir «Remote database is up to date»
```

El dump crea les FK en el mateix ordre que les migracions originals: Postgres executa els `on delete cascade` en ordre de creació, i l'esborrat de comptes en depèn. Si mai el regeneres, conserva aquest ordre i afegeix-hi el que `pg_dump --schema=public` no inclou (triggers d'`auth.users`, política de `realtime.messages`, `grant`/`revoke` de taules i funcions).

> **Per buidar la BD i tornar a aplicar des de zero:** `npx supabase db reset --linked`. Esborra totes les dades i torna a aplicar les migracions. No facis servir `drop schema public cascade; create schema public;`: l'esquema nou no té els permisos per defecte de Supabase (`anon`, `authenticated`) i l'app falla amb `permission denied for schema public`. A més, `supabase db push` no torna a aplicar les migracions que ja consten com a aplicades.

---

## Errors habituals

| Error | Causa | Solució |
|---|---|---|
| `redirect_uri_mismatch` | La URI a Google no coincideix amb la Callback URL de Supabase | Torna a copiar-la exacta a B3.6 |
| `Access blocked` / `access_denied` | L'app és en *Testing* i el teu correu no és a *Test users* | Afegeix-lo (B2.7) o publica l'app (B2.8) |
| Torna a `localhost` però sense sessió | La URL no és a *Redirect URLs* | Afegeix-la a la part D |
| Redirigeix a una web equivocada | *Site URL* mal configurada | Corregeix-la a la part D |
| "Falten VITE_SUPABASE_URL…" a la consola | Falta `.env` o no has reiniciat el servidor | Crea el `.env` i reinicia |
| El client no connecta | La URL acaba en `/rest/v1/` | Treu aquest final (E1.4) |
| `permission denied for schema public` (42501) | S'ha recreat l'esquema `public` a mà i ha perdut els permisos per defecte | `supabase db reset --linked`, o restaura els `grant` sobre l'esquema |
| `permission denied for table …` (42501) en una taula nova | Les taules noves de `public` no reben privilegis per defecte | Afegeix els `grant` a la migració que crea la taula (vegeu `docs/SEGURETAT.md`, invariant 20) |

## Quan publiquis l'app a Cloudflare

L'app es publica com a **Worker amb fitxers estàtics** (Cloudflare Workers Builds). La configuració és a `wrangler.jsonc`: nom del Worker, directori `./dist` i fallback de SPA. Cloudflare llegeix `public/_headers` (capçaleres de seguretat), que Vite copia a `dist/`.

### Primer deploy

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Import a repository**.
2. Autoritza l'accés al teu compte de GitHub i selecciona el repositori `on-mengem`.
3. Configuració:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (el valor per defecte)
   - **Production branch:** `main`
4. A **Advanced settings → Build variables**, afegeix:
   - `VITE_SUPABASE_URL` → la URL del teu projecte Supabase (`https://<ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` → la clau pública (`sb_publishable_...` o `eyJ...`)

   Han de ser **variables de build** perquè Vite les incrusta al bundle quan compila. Les *Variables and secrets* del Worker (i les `vars` de `wrangler.jsonc`) són de runtime i Vite no les veu; per això `wrangler.jsonc` no en defineix cap. Les builds de previsualització (`wrangler preview`) exigeixen un bloc `previews` a `wrangler.jsonc`, que pot ser buit; si hi afegeixes `vars`, cal repetir-les a `previews.vars` amb els mateixos noms. Si ja has creat el Worker, les trobaràs a **Settings → Build → Variables and secrets**.
5. No cal definir `NODE_VERSION`: Cloudflare llegeix la versió de `.nvmrc`.
6. Prem **Deploy**. Un cop acabat, la URL és `https://on-mengem.<el-teu-subdomini>.workers.dev`. Copia-la.

### Connectar la URL de producció a Supabase i Google

7. **Supabase → Authentication → URL Configuration:**
   - Afegeix la URL a **Redirect URLs**.
   - Canvia la **Site URL** a la URL de producció (o deixa `localhost` si encara estàs en proves).
8. **Google Cloud → APIs & Services → Credentials → el teu client OAuth:**
   - Afegeix la URL a **Authorized JavaScript origins** (B3.5). La *redirect URI* de Google no canvia (sempre és la de Supabase).

### Desplegaments posteriors

Cloudflare redesplega automàticament cada vegada que fas `git push` a `main`. Les altres branques generen versions de previsualització que no es publiquen a producció. Per desplegar des de la terminal: `npm run build && npx wrangler deploy` (cal `npx wrangler login` abans i tenir les variables `VITE_*` al `.env`).

### Com arriben les versions noves a l'app instal·lada

Quan es publica una versió, el Service Worker nou es descarrega però no s'activa sol: a la barra superior apareix el botó **Actualitzar** (al mòbil, una icona amb un punt), que l'activa i recarrega la pàgina (`src/context/UpdateContext.tsx` i `src/components/UpdateButton.tsx`, `registerType: 'prompt'` a `vite.config.ts`). Si l'usuari no el prem, la versió nova s'aplica la propera vegada que obri l'app de zero.

El navegador busca un `sw.js` nou en obrir l'app; a més, l'app ho comprova una vegada al dia, amb l'app oberta o en tornar-hi des de segon pla (una PWA que es reprèn no torna a navegar i, si no, podria quedar-se dies amb la versió vella). `public/_headers` marca `sw.js`, la pàgina i el manifest amb `Cache-Control: no-cache` perquè Cloudflare no en serveixi una còpia antiga.

La icona i el nom de l'app instal·lada no depenen del Service Worker: Android els actualitza pel seu compte al cap d'uns dies i iOS no ho fa mai (cal treure l'app de la pantalla d'inici i tornar-la a afegir).

### Capçaleres de seguretat

El build injecta una `Content-Security-Policy` com a `<meta>` (`vite.config.ts`). Les imatges externes només poden venir de `*.googleusercontent.com` (la foto del compte de Google) i de `tile.openstreetmap.org` (les tessel·les del mapa), i l'única connexió externa a part de Supabase és `nominatim.openstreetmap.org` (vegeu [Mapa](#mapa-openstreetmap)). Si afegeixes un domini extern, cal autoritzar-lo a `vite.config.ts`. La font (Plus Jakarta Sans) s'empaqueta amb l'app (`@fontsource-variable/plus-jakarta-sans`), així que la CSP no autoritza cap domini de fonts extern. Les capçaleres `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy` i `Cross-Origin-Opener-Policy` les serveix Cloudflare a partir de `public/_headers`, que ja és al repositori.

L'inici de sessió fa servir el flux **PKCE** (`src/supabase/client.ts`): Google torna a l'app amb un `?code=` d'un sol ús i els tokens no apareixen mai a la URL.

## Mapa (OpenStreetMap)

La vista de mapa dels restaurants fa servir [Leaflet](https://leafletjs.com) amb les tessel·les d'OpenStreetMap, i [Nominatim](https://nominatim.org) per calcular les coordenades de l'adreça. No cal cap clau ni registre, però cal respectar les polítiques d'ús de la OpenStreetMap Foundation ([tessel·les](https://operations.osmfoundation.org/policies/tiles/) i [Nominatim](https://operations.osmfoundation.org/policies/nominatim/)):

- Es mostra l'atribució «© OpenStreetMap» al mapa.
- Nominatim només es consulta quan l'usuari desa un restaurant amb una adreça nova o prem «Ubicar-los» al mapa, com a màxim una petició per segon (`src/utils/geocode.ts`). Res d'autocompletat ni de consultes automàtiques en segon pla.
- Són serveis de voluntaris sense garanties: si no responen, el restaurant es desa igualment sense ubicació i es pot ubicar més tard des del mapa. Si l'ús creix molt, cal passar a un proveïdor amb clau (p. ex. MapTiler), canviant la URL de `src/components/RestaurantMap.tsx` i `src/utils/geocode.ts` i la CSP.

Les coordenades es guarden a les columnes `lat` i `lng` de `restaurants` (originalment, migració `0016_restaurant_coordinates.sql`). Els restaurants que ja existien abans no tenen coordenades: surten al mapa un cop algú prem «Ubicar-los» o els torna a desar.

## Nota sobre el pla gratuït

Supabase pausa els projectes gratuïts després d'aproximadament una setmana sense activitat. Es reactiven des del panell.

## Entorn local amb Docker (opcional)

Permet provar sense tocar el projecte de Supabase al núvol. Cal Docker.

1. *(Opcional, només per entrar amb el teu compte de Google)* A Google Cloud (part C), afegeix com a *Authorized redirect URI*: `http://127.0.0.1:54321/auth/v1/callback`, i omple `supabase/.env` amb `SUPABASE_AUTH_GOOGLE_CLIENT_ID` i `SUPABASE_AUTH_GOOGLE_SECRET` (el fitxer està ignorat per git).
2. `make local`: arrenca Supabase (aplica les migracions i, el primer cop, les dades de prova), genera `.env.localdb` i engega l'app a `http://localhost:3000`.

Altres ordres (`make help` les llista totes): `make db-stop`, `make db-reset` (esborra les dades i torna a carregar les de prova), `make db-test`, `make db-types`, `make audit` (vulnerabilitats conegudes de les dependències, amb `npm audit`). `npm run dev` continua usant el `.env` del núvol. Studio és a `http://127.0.0.1:54323`.

### Dades de prova

[supabase/seed.sql](../supabase/seed.sql) omple la BD local amb 5 usuaris, 2 grups, restaurants, desitjats, visites (grupals i privades) i alertes, amb dates dels darrers mesos. No és una migració: només el carreguen `make db-reset` i el primer `make db-start`, i `npx supabase db push` no l'envia mai a producció.

- **Usuaris** (contrasenya `onmengem`): `marta@`, `pau@`, `laia@`, `jordi@` i `nuria@onmengem.local`. Amb `make dev`, la pantalla de benvinguda mostra un botó per a cadascun (només en mode `localdb`; el build de producció no l'inclou). Per provar el temps real, obre dues finestres (una d'incògnit) amb usuaris diferents.
- **Grups**: «Sopars de divendres» (codi `TAPES2`; Marta n'és l'owner, amb Pau, Laia i Jordi) i «Família» (codi `CASA23`; Pau n'és l'owner, amb Núria i Marta). Si entres amb el teu Google, uneix-t'hi amb aquests codis.
- Per tornar a l'estat inicial: `make db-reset` (esborra també el que hagis creat en local).
