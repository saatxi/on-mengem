# Configuració inicial del projecte

Guia pas a pas per posar en marxa **On menjem?** amb Supabase (base de dades + Realtime) i Google (inici de sessió).

Requisits: Node 24 (`nvm use`, llegeix `.nvmrc`), un compte de [Supabase](https://supabase.com) i un compte de Google.

Ordre recomanat: **A → B → C → D → E**. Cal anar i tornar entre Supabase i Google, perquè cadascun et dona una dada que l'altre necessita:

- Supabase et dona la *Callback URL*, que va a Google.
- Google et dona el *Client ID* i el *Client Secret*, que van a Supabase.

---

## A. Crear el projecte a Supabase i copiar la Callback URL

1. Entra a [supabase.com](https://supabase.com), inicia sessió i prem **New project**.
2. Posa un nom (per exemple `on-menjem`), una contrasenya de base de dades (guarda-la) i la regió més propera (per exemple *West EU*). Prem **Create**. Tarda un parell de minuts.
3. Quan estigui llest, ves a **SQL Editor → New query**, enganxa el contingut de [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) i prem **Run**. Ha de dir "Success".
4. Ves a **Authentication → Sign In / Providers** i obre **Google**.
5. Copia el camp **Callback URL (for OAuth)**. Té aquest aspecte: `https://abcdefgh.supabase.co/auth/v1/callback`.
6. Deixa aquesta pestanya oberta.

## B. Crear les credencials a Google Cloud

### B1. Projecte
1. Entra a [console.cloud.google.com](https://console.cloud.google.com) amb el teu compte de Google.
2. A dalt a l'esquerra, prem el selector de projecte → **New project**.
3. Nom: `On menjem` → **Create**. Comprova que queda seleccionat al selector.

### B2. Pantalla de consentiment
És la pantalla on Google pregunta a l'usuari si deixa entrar l'app.

1. Menú ☰ → **APIs & Services → OAuth consent screen** (en versions noves: **Google Auth Platform**). Prem **Get started** si és la primera vegada.
2. **App information:** nom `On menjem?` i el teu correu d'assistència.
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
4. **Name:** `On menjem web`.
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

## Errors habituals

| Error | Causa | Solució |
|---|---|---|
| `redirect_uri_mismatch` | La URI a Google no coincideix amb la Callback URL de Supabase | Torna a copiar-la exacta a B3.6 |
| `Access blocked` / `access_denied` | L'app és en *Testing* i el teu correu no és a *Test users* | Afegeix-lo (B2.7) o publica l'app (B2.8) |
| Torna a `localhost` però sense sessió | La URL no és a *Redirect URLs* | Afegeix-la a la part D |
| Redirigeix a una web equivocada | *Site URL* mal configurada | Corregeix-la a la part D |
| "Falten VITE_SUPABASE_URL…" a la consola | Falta `.env` o no has reiniciat el servidor | Crea el `.env` i reinicia |
| El client no connecta | La URL acaba en `/rest/v1/` | Treu aquest final (E1.4) |

## Quan publiquis l'app

Quan tinguis una URL de producció (Cloudflare Pages, Netlify, GitHub Pages…):

1. Afegeix-la a **Redirect URLs** i, si vols, canvia la **Site URL** (part D).
2. Afegeix-la als **Authorized JavaScript origins** de Google (B3.5). La *redirect URI* de Google no canvia, perquè sempre és la de Supabase.
3. Defineix `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` com a variables d'entorn de la build al servei d'hostatge.

## Nota sobre el pla gratuït

Supabase pausa els projectes gratuïts després d'aproximadament una setmana sense activitat. Es reactiven des del panell.
