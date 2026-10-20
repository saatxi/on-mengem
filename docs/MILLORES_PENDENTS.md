# Millores pendents

Llista de millores detectades a la revisió general del codi (octubre de 2026) que encara no s'han fet. Cada punt indica el problema, la proposta, la prioritat i una estimació d'esforç (S: unes hores, M: un o dos dies, L: més).

Quan en facis una, treu-la d'aquí al mateix commit.

## Comprovacions manuals al panell de Supabase

**Problema.** Hi ha opcions de seguretat que no són al repositori, sinó al panell del projecte, i no es poden verificar des del codi.

**Proposta.**
- *Authentication → Providers*: si no es fa servir el proveïdor **Email**, desactiva'l. Si està actiu, qualsevol persona es pot registrar amb un correu i una contrasenya de 6 caràcters sense passar per Google.
- *Authentication → URL Configuration*: a les *Redirect URLs* hi ha d'haver només la URL de producció exacta (i `localhost` si cal), sense comodins.

**Prioritat:** alta · **Esforç:** S

## Quotes contra l'abús

**Problema.** No hi ha cap límit de files per usuari o per grup, ni de grups creats per usuari. Un usuari autenticat pot omplir la base de dades (el pla gratuït de Supabase té 500 MB) o inundar un grup d'alertes afegint restaurants en bucle. `docs/SEGURETAT.md` ja indica que el límit de peticions i l'spam de grups queden fora d'abast.

**Proposta.** Una migració nova amb triggers `before insert` que comptin les files i rebutgin l'operació quan es passa del límit, de l'estil del límit d'intents de `join_attempts`. Per exemple: 2.000 restaurants i 2.000 desitjats a l'espai personal, 5.000 per grup, i 20 grups creats per usuari (`create_group`). Cal afegir tests pgTAP i documentar-ho a `docs/SEGURETAT.md`.

**Prioritat:** mitjana · **Esforç:** M

## Conversió atòmica de desitjat a restaurant

**Problema.** `convertWishlistToRestaurant` (`src/hooks/useRealtimeData.ts`) fa tres crides des del client: marca el desitjat com a visitat, crea el restaurant i registra la visita. Si falla la segona, desfà la primera a mà; si falla la tercera, el restaurant queda creat sense visita.

**Proposta.** Una RPC `convert_wishlist_to_restaurant(p_wishlist_id, p_visited_on, p_rating, p_notes, p_attendees, p_shared)` que ho faci tot dins d'una transacció, amb les mateixes comprovacions de visibilitat que `copy_to_groups` i `save_visit`, i els seus tests.

**Prioritat:** mitjana · **Esforç:** M

## Tipus generats de la base de dades i `strict`

**Problema.** `src/supabase/mappers.ts` treballa amb `Record<string, any>` i `tsconfig.json` no té `strict`. Si es reanomena una columna o es fa un error tipogràfic en un nom, ni el compilador ni el lint ho detecten.

**Proposta.** Generar els tipus amb `npx supabase gen types typescript --local > src/supabase/database.types.ts`, passar-los a `createClient<Database>()` i tipar els mappers amb `Tables<'restaurants'>`, etc. Després, activar `strict` (o `strictNullChecks` primer) i anar corregint els errors.

**Prioritat:** mitjana · **Esforç:** M

## Tests de les funcions pures

**Problema.** No hi ha tests de JavaScript. Les funcions de `src/supabase/mappers.ts` i `src/utils/restaurantFields.ts` (ordenació de visites, `toInstagramHandle`, `safeHttpUrl`, `localToday`, `canEditVisit`) són fàcils de trencar sense adonar-se'n.

**Proposta.** Afegir Vitest (s'integra amb la configuració de Vite) amb un script `npm test` i uns quants tests d'aquestes funcions.

**Prioritat:** baixa · **Esforç:** S

## Enllaços directes a un restaurant

**Problema.** El botó «Compartir» del detall comparteix `window.location.href`, que sempre és l'arrel de l'app: qui rep l'enllaç no arriba al restaurant.

**Proposta.** Un paràmetre a la URL (p. ex. `?r=<id>`) que `App.tsx` llegeixi en carregar per obrir el detall, i que el botó de compartir l'inclogui. RLS ja garanteix que només el pot obrir qui hi té accés.

**Prioritat:** baixa · **Esforç:** S

## Diàlegs propis en lloc de `alert()` i `confirm()`

**Problema.** Les confirmacions (esborrar, sortir del grup, tancar sessió…) fan servir els diàlegs natius del navegador, que no segueixen l'estil de l'app i en algunes PWA instal·lades queden poc integrats.

**Proposta.** Un component `ConfirmDialog` basat en `src/components/Modal.tsx` i una funció `useConfirm()` que retorni una promesa, per substituir `confirm()` sense haver de reescriure la lògica de cada botó.

**Prioritat:** baixa · **Esforç:** S

## Versions majors de dependències

**Problema.** Hi ha versions majors noves de `lucide-react` (1.x) i `vite-plugin-pwa` (2.x). `npm audit` no troba vulnerabilitats, però quedar-se enrere fa més difícils les actualitzacions futures.

**Proposta.** Actualitzar-les en una branca a part, revisar les notes de canvis (noms d'icones a `lucide-react`, configuració del Service Worker a `vite-plugin-pwa`) i comprovar el build i la PWA amb `npm run build && npm run preview`.

**Prioritat:** baixa · **Esforç:** S
