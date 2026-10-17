# Especificació de seguretat (Supabase RLS)

Totes les taules tenen RLS activada ([migració](../supabase/migrations/0001_init.sql)). Cada invariant i cada atac d'aquest document està verificat per [supabase/tests/rls.test.sql](../supabase/tests/rls.test.sql) (pgTAP, 58 comprovacions).

Executar-los: `npx supabase start` (requereix Docker) i després `npx supabase test db`. Si canvies una política, una funció o un trigger, actualitza el test corresponent i aquest document.

## Invariants
1. **Identitat**: només es pot editar el propi perfil (`id = auth.uid()`). Els perfils només són visibles per a un mateix i per als companys de grup.
2. **Usuari nou**: només es crea el perfil. Cap grup, cap alerta, cap dada d'exemple.
3. **Espai personal** (`group_id IS NULL`): només el creador pot llegir, escriure i esborrar.
4. **Grups**: llegir i escriure contingut de grup requereix ser membre (`is_group_member`).
5. **Pertinença només via RPC**: `create_group` i `join_group_by_code` són l'única manera de crear grups i d'inserir a `group_members`. Un membre només pot sortir ell mateix; l'owner pot expulsar.
6. **Immutabilitat**: `created_by` i `user_id` no canvien. `group_id` només canvia via `move_to_group` (propietari de l'ítem i membre del destí).
7. **Còpies**: `copy_to_groups` exigeix visibilitat de l'origen i pertinença a cada grup destí. L'original es manté.
8. **Alertes**: només membres les creen. `read_by` només s'actualitza via `mark_alerts_read`, que ignora els grups dels quals no ets membre.
9. **Esborrar**: el creador de l'ítem o l'owner del grup. Només l'owner esborra o edita el grup.
10. **Límits de mida i valors** via `CHECK` (noms, notes, tags ≤ 20, `status` d'una llista tancada…).
11. **Anònims**: cap accés a les dades ni a les funcions (`EXECUTE` revocat per a `anon`).

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
| 12 | `status` invàlid o payloads sobredimensionats | `CHECK` constraints | "status de wishlist invàlid és rebutjat" |
| 13 | Expulsar un altre membre sent-ne un de normal | `members_delete` | "bob no pot expulsar alice" |
| 14 | Editar `read_by` d'una alerta directament | cap policy d'update a `alerts` | "bob no pot editar alertes directament" |

## Notes
- Els tests fixen tant `request.jwt.claims` com `request.jwt.claim.sub`, perquè algunes versions antigues de `auth.uid()` només llegeixen la segona.
- Els tests ja van detectar un error real: el trigger `lock_ownership` fallava en moure ítems perquè avaluava `new.user_id` en una taula que no té aquest camp. Està corregit a la migració.
- Fora d'abast: límit de peticions (rate limiting), spam de grups i validació del contingut dels textos. Això caldria afegir-ho a part.
