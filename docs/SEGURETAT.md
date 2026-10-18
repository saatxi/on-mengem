# Especificació de seguretat (Supabase RLS)

Totes les taules tenen RLS activada ([migracions](../supabase/migrations/)). Cada invariant i cada atac d'aquest document està verificat per [supabase/tests/rls.test.sql](../supabase/tests/rls.test.sql) (pgTAP, 92 comprovacions).

Executar-los: `npx supabase start` (requereix Docker) i després `npx supabase test db`. Si canvies una política, una funció o un trigger, actualitza el test corresponent i aquest document.

## Invariants
1. **Identitat**: només es pot editar el propi perfil (`id = auth.uid()`). Els perfils només són visibles per a un mateix i per als companys de grup. Només s'editen `nickname`, `avatar`, `active_group_id` (d'un grup propi) i `last_login_at`; el perfil no es pot esborrar.
2. **Usuari nou**: només es crea el perfil. Cap grup, cap alerta, cap dada d'exemple.
3. **Espai personal** (`group_id IS NULL`): només el creador pot llegir, escriure i esborrar.
4. **Grups**: llegir i escriure contingut de grup requereix ser membre (`is_group_member`).
5. **Pertinença només via RPC**: `create_group` i `join_group_by_code` són l'única manera de crear grups i d'inserir a `group_members`. Un membre només pot sortir ell mateix; l'owner pot expulsar però no sortir (ha de cedir el grup amb `transfer_group_ownership` o esborrar-lo). El codi només canvia amb `regenerate_group_code` (owner) i es genera amb aleatorietat criptogràfica.
6. **Immutabilitat**: `created_by` i `user_id` no canvien. `group_id` només canvia via `move_to_group` (propietari de l'ítem i membre del destí).
7. **Còpies**: `copy_to_groups` exigeix visibilitat de l'origen i pertinença a cada grup destí. L'original es manté.
8. **Alertes**: les genera el servidor (triggers en afegir o moure ítems a un grup, en registrar visites, i les RPC de grups); cap client pot inserir-ne. Es purguen les de més de 90 dies. `read_by` només s'actualitza via `mark_alerts_read`, que ignora els grups dels quals no ets membre.
9. **Esborrar**: el creador de l'ítem o l'owner del grup. Només l'owner esborra o edita el grup.
10. **Límits de mida i valors** via `CHECK` (noms, notes, `status` d'una llista tancada…). `cuisine` (restaurants i desitjats) usa el domini `public.cuisine`: buit o un dels tipus de la llista de l'app.
11. **Autoria i esborrat de comptes**: `created_by_name`/`user_name` els posa el servidor des del perfil i són immutables. En esborrar un usuari es conserva el que va aportar als grups (`created_by` passa a `NULL`), s'elimina el seu espai personal i els grups que tenia passen al membre més antic. Des de l'app, un usuari només pot esborrar el seu propi compte amb `delete_my_account`, que usa `auth.uid()` i no accepta cap identificador.
12. **Codis d'invitació**: 10 intents fallits cada 10 minuts per usuari (`join_attempts`); després, `join_group_by_code` retorna `TOO_MANY_ATTEMPTS`.
13. **URL**: `wishlist.link` i `restaurants.link` només accepten `http(s)://`, `profiles.photo_url` només `https://` i `restaurants.instagram` / `wishlist.instagram` només un nom d'usuari (`[A-Za-z0-9._]`, màx. 30).
14. **Anònims**: cap accés a les dades ni a les funcions (`EXECUTE` revocat per a `anon`).
15. **Visites** (`restaurant_visits` i `visit_attendees`): les escriptures van exclusivament a través de `save_visit` i `delete_visit`. El client no pot fer `INSERT`, `UPDATE` ni `DELETE` directes. Cada membre del grup veu totes les visites (incloses les privades), però: una visita **grupal** la pot editar o esborrar qualsevol membre; una visita **privada** només la pot editar o esborrar l'autor (o qualsevol membre si l'autor ha esborrat el compte). Només l'autor pot canviar el camp `shared`. Els assistents han de ser membres del grup (o el propi usuari a l'espai personal). Les visites s'arrosseguen amb `move_to_group` però no es copien amb `copy_to_groups`. Esborrar el restaurant esborra les seves visites (cascade).

## Atacs que han de ser denegats

| # | Intent | Mecanisme | Test |
|---|--------|-----------|------|
| 1 | Editar el perfil d'un altre | policy `profiles_update` | "bob no pot editar el perfil d'alice" |
| 2 | Accedir sense sessió | rol `anon` sense dades ni `EXECUTE` | 4 tests "anònim: …" |
| 3 | `INSERT` directe a `group_members` per entrar sense codi | cap policy d'insert | "bob no pot inserir-se directament…" |
| 4 | Llegir restaurants/desitjats personals d'un altre | `*_select` | "bob no veu els … personals d'alice" |
| 5 | Llegir o escriure en un grup sense ser-ne membre | `is_group_member` | "bob no veu el contingut de G2", "bob no pot escriure a G2" |
| 6 | Falsificar `created_by` | `WITH CHECK` d'insert | "bob no pot crear un restaurant amb created_by = alice" |
| 7 | Canviar `group_id` amb `UPDATE` directe | trigger `lock_ownership` | "no es pot canviar group_id amb UPDATE directe" |
| 8 | Moure o copiar un ítem aliè | filtres de propietat a les RPC | "bob no pot moure…", "bob no pot copiar… (0 còpies)" |
| 9 | Copiar o moure a un grup on no ets membre | comprovació a les RPC | "alice no pot copiar/moure a G2" |
| 10 | Marcar com a llegides alertes d'un grup aliè | `mark_alerts_read` filtra per membre | "atac 10: carol no ha pogut marcar alertes…" |
| 11 | Esborrar o editar un grup que no és teu | `groups_delete` / `groups_update` | "bob no pot esborrar G1", "bob no pot editar G1" |
| 12 | `status` invàlid o payloads sobredimensionats | `CHECK` constraints i domini `public.cuisine` | "status de wishlist invàlid és rebutjat", "una cuina (de desitjat) fora de la llista és rebutjada" |
| 13 | Expulsar un altre membre sent-ne un de normal | `members_delete` | "bob no pot expulsar alice" |
| 14 | Editar `read_by` d'una alerta directament | cap policy d'update a `alerts` | "bob no pot editar alertes directament" |
| 15 | Inserir alertes falses | cap policy d'insert a `alerts` | "bob no pot inserir alertes directament" |
| 16 | Enllaç `javascript:`/`data:` | `CHECK wishlist_link_http` / `restaurants_link_http` / `restaurants_instagram_handle` / `wishlist_instagram_handle` | "un enllaç (de restaurant) que no és http(s) és rebutjat", "un instagram (de desitjat) que no és un nom d'usuari és rebutjat" |
| 17 | Falsificar el nom d'autor | trigger `set_author_name` + `lock_ownership` | "el created_by_name el posa el servidor", "created_by_name és immutable" |
| 18 | Activar un grup aliè, esborrar el perfil o editar l'email | `profiles_update` amb `WITH CHECK`, privilegis per columna, sense `profiles_delete` | 3 tests de bob |
| 19 | Posar un codi a mà o deixar el grup orfe | privilegis per columna de `groups`; `members_delete` | "l'owner no pot posar un codi a mà", "l'owner no pot sortir del seu grup" |
| 20 | Força bruta de codis d'invitació | límit d'intents a `join_group_by_code` | "després de 10 intents fallits…" |
| 21 | Editar o esborrar una visita privada d'un altre membre | `can_edit_visit` a `save_visit` / `delete_visit` | "bob2 no pot editar la visita privada d'alice2" |
| 22 | Canviar `shared` d'una visita que no és teva | verificació d'autor a `save_visit` | "bob2 no pot canviar shared d'una visita privada d'alice2" |
| 23 | Afegir com a assistent algú fora del grup | comprovació de membres a `save_visit` | "no es pot posar com a assistent algú que no és membre del grup" |
| 24 | Inserir directament a `restaurant_visits` | `REVOKE INSERT` al rol `authenticated` | "no es pot inserir a restaurant_visits directament des del client" |

## Notes
- Els tests fixen tant `request.jwt.claims` com `request.jwt.claim.sub`, perquè algunes versions antigues de `auth.uid()` només llegeixen la segona.
- Els tests ja van detectar un error real: el trigger `lock_ownership` fallava en moure ítems perquè avaluava `new.user_id` en una taula que no té aquest camp. Està corregit a la migració.
- `join_group_by_code` retorna `{error: …}` en lloc de llançar una excepció: una excepció desfaria el registre de l'intent fallit.
- Fora d'abast: límit de peticions general, spam de grups i validació del contingut dels textos. Això caldria afegir-ho a part. Els companys de grup veuen l'email dels perfils (decisió de disseny pendent).
