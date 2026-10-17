-- Tests de seguretat (RLS + RPC) amb pgTAP.  Execució: `supabase test db`
-- Veure docs/SEGURETAT.md per a la correspondència amb els invariants.
begin;
select no_plan();

-- ------------------------------------------------------------ Esquema
select hasnt_column('public', 'restaurants', 'tags', 'els restaurants ja no tenen etiquetes');

-- ------------------------------------------------------------ Dades de prova
-- A = alice (propietària de G1), B = bob (membre de G1), C = carol (propietària de G2, aliena a G1)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev',   '{"full_name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.dev', '{"full_name":"Carol"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@test.dev',  '{"full_name":"Dave","avatar_url":"javascript:alert(1)"}');

insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000001', 'G1', 'AAAAAA', '00000000-0000-0000-0000-00000000000a', 'Alice'),
  ('10000000-0000-0000-0000-000000000002', 'G2', 'CCCCCC', '00000000-0000-0000-0000-00000000000c', 'Carol');

insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c');

insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000001', null,                                   'A personal 1', '00000000-0000-0000-0000-00000000000a'),
  ('20000000-0000-0000-0000-000000000002', null,                                   'A personal 2', '00000000-0000-0000-0000-00000000000a'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'G1 resto',     '00000000-0000-0000-0000-00000000000a'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'G2 resto',     '00000000-0000-0000-0000-00000000000c');

insert into public.wishlist (id, group_id, restaurant_name, user_id) values
  ('30000000-0000-0000-0000-000000000001', null, 'A desitjat personal', '00000000-0000-0000-0000-00000000000a');

insert into public.alerts (id, group_id, user_id, type, title, message) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', 'group_joined', 'Alerta G1', 'missatge');

-- ------------------------------------------------------------ Invariant 0: usuari nou = només perfil
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 1,
          'nou usuari: es crea el perfil');
select is((select count(*)::int from public.group_members where user_id = '00000000-0000-0000-0000-00000000000b'), 1,
          'nou usuari: no es crea cap grup automàticament (bob només és a G1 per les dades de prova)');
select is((select count(*)::int from public.restaurants where created_by = '00000000-0000-0000-0000-00000000000b'), 0,
          'nou usuari: cap dada d''exemple');
select is((select count(*)::int from public.alerts where user_id = '00000000-0000-0000-0000-00000000000b'), 0,
          'nou usuari: cap alerta de benvinguda');

-- ------------------------------------------------------------ Atac 2: anònim
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.restaurants), 0, 'anònim: no veu cap restaurant');
select is((select count(*)::int from public.groups), 0, 'anònim: no veu cap grup');
select throws_ok($$ select public.create_group('Hack') $$, '42501', null, 'anònim: no pot cridar create_group');
select throws_ok($$ select public.join_group_by_code('AAAAAA') $$, '42501', null, 'anònim: no pot cridar join_group_by_code');
reset role;

-- ------------------------------------------------------------ Com a Bob (membre de G1)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true); -- compatibilitat amb versions antigues d'auth.uid()
set local role authenticated;

-- Atac 4: espai personal aliè
select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000001'), 0,
          'bob no veu els restaurants personals d''alice');
select is((select count(*)::int from public.wishlist where id = '30000000-0000-0000-0000-000000000001'), 0,
          'bob no veu els desitjats personals d''alice');
-- Membres veuen contingut de grup
select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000003'), 1,
          'bob (membre) veu el restaurant de G1');
select is((select count(*)::int from public.alerts where id = '40000000-0000-0000-0000-000000000001'), 1,
          'bob (membre) veu les alertes de G1');
-- Atac 5: grup aliè
select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000004'), 0,
          'bob no veu el contingut de G2 (no n''és membre)');
select is((select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000002'), 0,
          'bob no veu el grup G2');
-- Atac 1: perfil aliè
select is_empty($$ update public.profiles set nickname = 'Hackejat' where id = '00000000-0000-0000-0000-00000000000a' returning 1 $$,
                'bob no pot editar el perfil d''alice');
-- Atac 6: falsificar created_by
select throws_ok($$
  insert into public.restaurants (group_id, name, created_by)
  values ('10000000-0000-0000-0000-000000000001', 'Fals', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'bob no pot crear un restaurant amb created_by = alice');
-- Atac 5: escriure a un grup aliè
select throws_ok($$
  insert into public.restaurants (group_id, name, created_by)
  values ('10000000-0000-0000-0000-000000000002', 'Intrús', '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'bob no pot escriure a G2 (no n''és membre)');
-- Escriptura legítima
select lives_ok($$
  insert into public.restaurants (group_id, name, created_by)
  values ('10000000-0000-0000-0000-000000000001', 'De Bob', '00000000-0000-0000-0000-00000000000b') $$,
  'bob sí pot crear un restaurant a G1');
-- Atac 3: entrar a un grup sense codi
select throws_ok($$
  insert into public.group_members (group_id, user_id)
  values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'bob no pot inserir-se directament a group_members');
-- Esborrar
select is_empty($$ delete from public.restaurants where id = '20000000-0000-0000-0000-000000000003' returning 1 $$,
                'bob no pot esborrar un restaurant d''alice si no és owner del grup');
select is_empty($$ delete from public.groups where id = '10000000-0000-0000-0000-000000000001' returning 1 $$,
                'bob no pot esborrar G1 (atac 11)');
select is_empty($$ update public.groups set name = 'Robat' where id = '10000000-0000-0000-0000-000000000001' returning 1 $$,
                'bob no pot editar G1 (no és owner)');
select is_empty($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000001'
                     and user_id = '00000000-0000-0000-0000-00000000000a' returning 1 $$,
                'bob no pot expulsar alice');
-- Atac 12: constraints
select throws_ok($$
  insert into public.wishlist (restaurant_name, status, user_id)
  values ('X', 'inventat', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'status de wishlist invàlid és rebutjat');
-- Alertes: read_by no s'edita directament
select is_empty($$ update public.alerts set read_by = '{}' where id = '40000000-0000-0000-0000-000000000001' returning 1 $$,
                'bob no pot editar alertes directament');
select lives_ok($$ select public.mark_alerts_read(array['40000000-0000-0000-0000-000000000001']::uuid[]) $$,
                'bob pot marcar com a llegida una alerta del seu grup');
-- Atac 8: moure/copiar ítems aliens
select throws_ok($$ select public.move_to_group('restaurant', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001') $$,
                 'P0001', null, 'bob no pot moure un restaurant personal d''alice');
select is((select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000001',
                                         array['10000000-0000-0000-0000-000000000001']::uuid[])), 0,
          'bob no pot copiar un restaurant personal d''alice (0 còpies)');
-- Atac 15: alertes falsificades des del client
select throws_ok($$
  insert into public.alerts (group_id, user_id, type, title, message)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'group_joined', 'Fals', 'Avís fals') $$,
  '42501', null, 'bob no pot inserir alertes directament');
-- Atac 16: enllaç amb esquema perillós
select throws_ok($$
  insert into public.wishlist (restaurant_name, link, user_id)
  values ('X', 'javascript:alert(1)', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'un enllaç que no és http(s) és rebutjat');
select throws_ok($$
  insert into public.restaurants (name, link, created_by)
  values ('X', 'javascript:alert(1)', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'un enllaç de restaurant que no és http(s) és rebutjat');
select throws_ok($$
  insert into public.restaurants (name, instagram, created_by)
  values ('X', 'evil/../../x?a=1', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'un instagram que no és un nom d''usuari és rebutjat');
-- Atac 17: nom d'autor falsificat
select lives_ok($$
  insert into public.restaurants (group_id, name, created_by, created_by_name)
  values ('10000000-0000-0000-0000-000000000001', 'Nom fals', '00000000-0000-0000-0000-00000000000b', 'Alice') $$,
  'bob crea un restaurant amb un created_by_name fals');
select throws_ok($$ update public.restaurants set created_by_name = 'Alice' where name = 'Nom fals' $$,
                 'P0001', null, 'created_by_name és immutable');
-- Atac 18: perfil i grup
select throws_ok($$ update public.profiles set active_group_id = '10000000-0000-0000-0000-000000000002'
                    where id = '00000000-0000-0000-0000-00000000000b' $$,
                 '42501', null, 'bob no pot activar un grup del qual no és membre');
select is_empty($$ delete from public.profiles where id = '00000000-0000-0000-0000-00000000000b' returning 1 $$,
                'bob no pot esborrar el seu perfil');
select throws_ok($$ update public.profiles set email = 'x@y.z' where id = '00000000-0000-0000-0000-00000000000b' $$,
                 '42501', null, 'bob no pot editar el seu email al perfil');
select throws_ok($$ select public.regenerate_group_code('10000000-0000-0000-0000-000000000001') $$,
                 'P0001', null, 'bob (no owner) no pot regenerar el codi de G1');
select throws_ok($$ select public.transfer_group_ownership('10000000-0000-0000-0000-000000000001',
                                                          '00000000-0000-0000-0000-00000000000b') $$,
                 'P0001', null, 'bob (no owner) no pot cedir G1');
reset role;

select is((select created_by_name from public.restaurants where name = 'Nom fals'), 'Bob',
          'el created_by_name el posa el servidor (perfil), no el client');
delete from public.restaurants where name = 'Nom fals';
select is((select photo_url from public.profiles where id = '00000000-0000-0000-0000-00000000000d'), null,
          'una foto de perfil que no és https es descarta');

select ok(exists (select 1 from public.alerts
                  where id = '40000000-0000-0000-0000-000000000001'
                    and '00000000-0000-0000-0000-00000000000b' = any (read_by)),
          'mark_alerts_read ha afegit bob a read_by');

-- ------------------------------------------------------------ Com a Carol (aliena a G1)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true); -- compatibilitat amb versions antigues d'auth.uid()
set local role authenticated;

select is((select count(*)::int from public.restaurants where group_id = '10000000-0000-0000-0000-000000000001'), 0,
          'carol no veu el contingut de G1');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 0,
          'carol no veu el perfil d''alice (no comparteixen grup)');
select lives_ok($$ select public.mark_alerts_read(array['40000000-0000-0000-0000-000000000001']::uuid[]) $$,
                'carol pot cridar mark_alerts_read però sense efecte');
select is((select public.join_group_by_code('ZZZZZZ') ->> 'error'), 'GROUP_NOT_FOUND',
          'codi inexistent => GROUP_NOT_FOUND');
reset role;
select ok(not exists (select 1 from public.alerts
                      where id = '40000000-0000-0000-0000-000000000001'
                        and '00000000-0000-0000-0000-00000000000c' = any (read_by)),
          'atac 10: carol no ha pogut marcar alertes d''un grup aliè');

-- ------------------------------------------------------------ Com a Alice (propietària de G1)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true); -- compatibilitat amb versions antigues d'auth.uid()
set local role authenticated;

select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000001'), 1,
          'alice veu els seus restaurants personals');
-- Atac 7 i immutabilitat
select throws_ok($$ update public.restaurants set group_id = '10000000-0000-0000-0000-000000000001'
                    where id = '20000000-0000-0000-0000-000000000001' $$,
                 'P0001', null, 'no es pot canviar group_id amb UPDATE directe');
select throws_ok($$ update public.restaurants set created_by = '00000000-0000-0000-0000-00000000000b'
                    where id = '20000000-0000-0000-0000-000000000003' $$,
                 'P0001', null, 'created_by és immutable');
-- Atac 9: copiar a un grup on no és membre
select throws_ok($$ select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000001',
                                                  array['10000000-0000-0000-0000-000000000002']::uuid[]) $$,
                 'P0001', null, 'alice no pot copiar a G2 (no n''és membre)');
select throws_ok($$ select public.move_to_group('restaurant', '20000000-0000-0000-0000-000000000001',
                                                '10000000-0000-0000-0000-000000000002') $$,
                 'P0001', null, 'alice no pot moure a G2 (no n''és membre)');
-- Còpia legítima: l'original es manté
select is((select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000001',
                                         array['10000000-0000-0000-0000-000000000001']::uuid[])), 1,
          'alice copia un restaurant personal a G1');
select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000001' and group_id is null), 1,
          'la còpia no treu l''original de l''espai personal');
select is((select count(*)::int from public.restaurants
           where group_id = '10000000-0000-0000-0000-000000000001' and name = 'A personal 1'), 1,
          'la còpia existeix a G1');
select is((select count(*)::int from public.alerts
           where group_id = '10000000-0000-0000-0000-000000000001' and type = 'restaurant_added'
             and message like '%"A personal 1"%'), 1,
          'copiar genera una alerta al grup destí (trigger)');
select is((select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000003',
                                         array['10000000-0000-0000-0000-000000000001']::uuid[])), 0,
          'no es copia un ítem al seu propi grup');
select is((select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000001',
                                         array['10000000-0000-0000-0000-000000000001',
                                               '10000000-0000-0000-0000-000000000001']::uuid[])), 1,
          'un grup repetit només rep una còpia');
-- Moviment legítim
select lives_ok($$ select public.move_to_group('restaurant', '20000000-0000-0000-0000-000000000002',
                                               '10000000-0000-0000-0000-000000000001') $$,
                'alice mou un restaurant personal a G1');
select is((select group_id from public.restaurants where id = '20000000-0000-0000-0000-000000000002'),
          '10000000-0000-0000-0000-000000000001'::uuid, 'el restaurant mogut ara és de G1');
select throws_ok($$ select public.move_to_group('restaurant', '20000000-0000-0000-0000-000000000002',
                                                '10000000-0000-0000-0000-000000000001') $$,
                 'P0001', null, 'un ítem que ja és d''un grup no es pot tornar a moure');
-- Desitjats: immutabilitat i moviment (branca 'wishlist' del trigger)
select throws_ok($$ update public.wishlist set user_id = '00000000-0000-0000-0000-00000000000b'
                    where id = '30000000-0000-0000-0000-000000000001' $$,
                 'P0001', null, 'user_id d''un desitjat és immutable');
select lives_ok($$ select public.move_to_group('wishlist', '30000000-0000-0000-0000-000000000001',
                                               '10000000-0000-0000-0000-000000000001') $$,
                'alice mou un desitjat personal a G1');
select is((select group_id from public.wishlist where id = '30000000-0000-0000-0000-000000000001'),
          '10000000-0000-0000-0000-000000000001'::uuid, 'el desitjat mogut ara és de G1');

-- Owner pot esborrar contingut d'altres membres
select is((select count(*)::int from public.restaurants where name = 'De Bob'), 1, 'alice veu el restaurant de bob');
select lives_ok($$ delete from public.restaurants where name = 'De Bob' $$, 'l''owner pot esborrar contingut de G1');
-- Crear grup
select lives_ok($$ select public.create_group('Nou grup', 'descripció') $$, 'alice pot crear un grup');
select is((select count(*)::int from public.groups where name = 'Nou grup' and code ~ '^[A-HJ-NP-Z2-9]{6}$'), 1,
          'el grup nou té un codi de 6 caràcters de l''alfabet permès');
-- Atac 19: l'owner no pot canviar el codi a mà ni sortir del seu grup
select throws_ok($$ update public.groups set code = 'AAAA' where name = 'Nou grup' $$,
                 '42501', null, 'l''owner no pot posar un codi a mà (només regenerate_group_code)');
select is_empty($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000001'
                     and user_id = '00000000-0000-0000-0000-00000000000a' returning 1 $$,
                'l''owner no pot sortir del seu grup');
select ok((select public.regenerate_group_code(id) from public.groups where name = 'Nou grup') ~ '^[A-HJ-NP-Z2-9]{6}$',
          'l''owner regenera el codi d''un grup seu');
reset role;

-- ------------------------------------------------------------ Carol s'uneix amb codi
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true); -- compatibilitat amb versions antigues d'auth.uid()
set local role authenticated;
select lives_ok($$ select public.join_group_by_code('aaaaaa') $$, 'carol s''uneix a G1 amb el codi (en minúscules)');
select is((select count(*)::int from public.restaurants where group_id = '10000000-0000-0000-0000-000000000001'), 4,
          'carol ara veu el contingut de G1');
select is((select (public.join_group_by_code('AAAAAA') ->> 'already_member')::boolean), true,
          'tornar a unir-se no duplica: already_member = true');
reset role;
select is((select count(*)::int from public.group_members
           where group_id = '10000000-0000-0000-0000-000000000001'
             and user_id = '00000000-0000-0000-0000-00000000000c'), 1,
          'carol només apareix un cop a group_members');

-- ------------------------------------------------------------ Atac 20: força bruta de codis (Dave)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
set local role authenticated;
select lives_ok($$ select public.join_group_by_code('NOPE' || g) from generate_series(1, 10) g $$,
                'dave fa 10 intents fallits');
select is((select public.join_group_by_code('AAAAAA') ->> 'error'), 'TOO_MANY_ATTEMPTS',
          'després de 10 intents fallits, ni el codi correcte funciona (límit)');
reset role;
select is((select count(*)::int from public.group_members where user_id = '00000000-0000-0000-0000-00000000000d'), 0,
          'dave no ha entrat a cap grup');

-- ------------------------------------------------------------ Cessió i sortida de grups
update public.profiles set active_group_id = '10000000-0000-0000-0000-000000000001'
 where id = '00000000-0000-0000-0000-00000000000b';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
set local role authenticated;
select lives_ok($$ select public.transfer_group_ownership('10000000-0000-0000-0000-000000000001',
                                                          '00000000-0000-0000-0000-00000000000b') $$,
                'alice cedeix G1 a bob');
select throws_ok($$ select public.transfer_group_ownership('10000000-0000-0000-0000-000000000001',
                                                          '00000000-0000-0000-0000-00000000000a') $$,
                 'P0001', null, 'alice (ja no owner) no pot tornar a cedir G1');
reset role;
select is((select owner_id from public.groups where id = '10000000-0000-0000-0000-000000000001'),
          '00000000-0000-0000-0000-00000000000b'::uuid, 'bob és el nou owner de G1');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
set local role authenticated;
select is_empty($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000001'
                     and user_id = '00000000-0000-0000-0000-00000000000b' returning 1 $$,
                'bob, ara owner, no pot sortir de G1');
select lives_ok($$ select public.transfer_group_ownership('10000000-0000-0000-0000-000000000001',
                                                          '00000000-0000-0000-0000-00000000000a') $$,
                'bob torna G1 a alice');
select lives_ok($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000001'
                     and user_id = '00000000-0000-0000-0000-00000000000b' $$,
                'bob (membre) pot sortir de G1');
reset role;
select is((select active_group_id from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), null,
          'en sortir, G1 deixa de ser l''espai actiu de bob');

-- ------------------------------------------------------------ Esborrat de comptes
insert into public.restaurants (group_id, name, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Orfe de bob', '00000000-0000-0000-0000-00000000000b'),
  (null,                                   'Personal de bob', '00000000-0000-0000-0000-00000000000b');
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select is((select created_by from public.restaurants where name = 'Orfe de bob'), null,
          'esborrar un usuari conserva el contingut que va aportar a un grup');
select is((select count(*)::int from public.restaurants where name = 'Personal de bob'), 0,
          'esborrar un usuari elimina el seu espai personal');

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is((select owner_id from public.groups where id = '10000000-0000-0000-0000-000000000001'),
          '00000000-0000-0000-0000-00000000000c'::uuid,
          'esborrar l''owner cedeix el grup al membre que queda (carol)');

select * from finish();
rollback;
