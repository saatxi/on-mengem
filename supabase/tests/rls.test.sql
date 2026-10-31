-- Tests de seguretat (RLS + RPC) amb pgTAP.  Execució: `supabase test db`
-- Veure docs/SEGURETAT.md per a la correspondència amb els invariants.
begin;
select no_plan();

-- ------------------------------------------------------------ Esquema
select hasnt_column('public', 'restaurants', 'tags', 'els restaurants ja no tenen etiquetes');
select hasnt_column('public', 'restaurants', 'visited', 'el booleà visited ha estat substituït per restaurant_visits');
select hasnt_column('public', 'profiles', 'email', 'el perfil no guarda l''email (els companys de grup no el poden llegir)');
select has_column('public', 'restaurants', 'lat', 'els restaurants tenen latitud (vista de mapa)');
select has_column('public', 'restaurants', 'lng', 'els restaurants tenen longitud (vista de mapa)');

-- ------------------------------------------------------------ Privilegis de taula (0018)
-- authenticated només té les operacions que tenen una política RLS; anon, cap.
select table_privs_are('public', t, 'anon', array[]::text[], 'anònim: cap privilegi a ' || t)
  from unnest(array['profiles', 'groups', 'group_members', 'restaurants', 'wishlist', 'alerts', 'join_attempts',
                    'restaurant_visits', 'visit_attendees', 'group_changes', 'reactions']) t;
select table_privs_are('public', t, 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
                       'authenticated: CRUD a ' || t)
  from unnest(array['restaurants', 'wishlist']) t;
select table_privs_are('public', t, 'authenticated', array['SELECT', 'DELETE'], 'authenticated: llegir i esborrar a ' || t)
  from unnest(array['groups', 'group_members']) t;
select table_privs_are('public', t, 'authenticated', array['SELECT'], 'authenticated: només lectura a ' || t)
  from unnest(array['alerts', 'restaurant_visits', 'visit_attendees', 'group_changes']) t;
select table_privs_are('public', t, 'authenticated', array[]::text[], 'authenticated: cap privilegi de taula a ' || t)
  from unnest(array['profiles', 'join_attempts']) t;
select column_privs_are('public', 'groups', c, 'authenticated', array['SELECT', 'UPDATE'],
                        'authenticated: pot editar groups.' || c)
  from unnest(array['name', 'description']) c;
select column_privs_are('public', 'groups', 'code', 'authenticated', array['SELECT'],
                        'authenticated: no pot editar groups.code');
select column_privs_are('public', 'profiles', c, 'authenticated', p,
                        'authenticated: privilegis de profiles.' || c)
  from (values ('id', array['SELECT']), ('nickname', array['SELECT', 'UPDATE']), ('avatar', array['SELECT', 'UPDATE']),
               ('photo_url', array['SELECT']), ('created_at', array['SELECT']),
               ('active_group_id', array['UPDATE']), ('last_login_at', array['UPDATE']),
               ('nickname_changed_at', array[]::text[])) v(c, p);
select table_privs_are('public', 'join_attempts', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
                       'service_role: CRUD sense TRUNCATE');

-- Reaccions (0003): llegir i esborrar les pròpies; en una alta, el client només tria l'ítem i l'emoji
select table_privs_are('public', 'reactions', 'authenticated', array['SELECT', 'DELETE'],
                       'authenticated: llegir i esborrar a reactions (insert només per columnes)');
select column_privs_are('public', 'reactions', c, 'authenticated', p, 'authenticated: privilegis de reactions.' || c)
  from (values ('restaurant_id', array['SELECT', 'INSERT']), ('wishlist_id', array['SELECT', 'INSERT']),
               ('visit_id', array['SELECT', 'INSERT']), ('emoji', array['SELECT', 'INSERT']),
               ('user_id', array['SELECT']), ('group_id', array['SELECT']), ('id', array['SELECT'])) v(c, p);
select table_privs_are('public', 'reactions', 'service_role', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
                       'service_role: CRUD a reactions sense TRUNCATE');

-- Les taules noves no s'exposen soles a la Data API (cal grant explícit a la migració)
create table public.probe_default_privs (id int);
select table_privs_are('public', 'probe_default_privs', r, array[]::text[], r || ': cap privilegi en una taula nova')
  from unnest(array['anon', 'authenticated', 'service_role']) r;
drop table public.probe_default_privs;

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
select throws_ok($$ select count(*) from public.restaurants $$, '42501', null, 'anònim: no veu cap restaurant');
select throws_ok($$ select count(*) from public.groups $$, '42501', null, 'anònim: no veu cap grup');
select throws_ok($$ select public.create_group('Hack') $$, '42501', null, 'anònim: no pot cridar create_group');
select throws_ok($$ select public.join_group_by_code('AAAAAA') $$, '42501', null, 'anònim: no pot cridar join_group_by_code');
select throws_ok($$ select nickname from public.profiles $$, '42501', null, 'anònim: no pot llegir perfils');
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
select throws_ok($$
  insert into public.restaurants (name, cuisine, created_by)
  values ('X', 'Inventada', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'una cuina de restaurant fora de la llista és rebutjada');
select throws_ok($$
  insert into public.wishlist (restaurant_name, cuisine, user_id)
  values ('X', 'Inventada', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'una cuina de desitjat fora de la llista és rebutjada');
-- Alertes: read_by no s'edita directament
select throws_ok($$ update public.alerts set read_by = '{}' where id = '40000000-0000-0000-0000-000000000001' $$,
                 '42501', null, 'bob no pot editar alertes directament');
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
select throws_ok($$
  insert into public.wishlist (restaurant_name, instagram, user_id)
  values ('X', 'evil/../../x?a=1', '00000000-0000-0000-0000-00000000000b') $$,
  '23514', null, 'un instagram de desitjat que no és un nom d''usuari és rebutjat');
-- Atac 17: nom d'autor falsificat
select lives_ok($$
  insert into public.restaurants (group_id, name, created_by, created_by_name)
  values ('10000000-0000-0000-0000-000000000001', 'Nom fals', '00000000-0000-0000-0000-00000000000b', 'Alice') $$,
  'bob crea un restaurant amb un created_by_name fals');
select throws_ok($$ update public.restaurants set created_by_name = 'Alice' where name = 'Nom fals' $$,
                 'P0001', null, 'created_by_name és immutable');
-- Atac 42: canviar o triar l'id d'un element (l'historial i restore_group_change hi depenen)
select throws_ok($$ update public.restaurants set id = gen_random_uuid() where id = '20000000-0000-0000-0000-000000000003' $$,
                 'P0001', 'id és immutable', 'bob no pot canviar l''id d''un restaurant de G1');
select is((select count(*)::int from public.restaurants
            where id = '20000000-0000-0000-0000-000000000003' and notes = 'Editat per bob'), 0,
          'abans d''editar, el restaurant de G1 no té la nota de bob');
select lives_ok($$ update public.restaurants set notes = 'Editat per bob' where id = '20000000-0000-0000-0000-000000000003' $$,
                'bob (membre) pot editar un restaurant de G1 sense tocar-ne l''id');
select lives_ok($$
  insert into public.wishlist (id, group_id, restaurant_name, user_id)
  values ('30000000-0000-0000-0000-0000000000b0', '10000000-0000-0000-0000-000000000001', 'Desitjat de Bob',
          '00000000-0000-0000-0000-00000000000b') $$,
  'bob crea un desitjat a G1 amb un id triat per ell');
select is((select count(*)::int from public.wishlist where id = '30000000-0000-0000-0000-0000000000b0'), 0,
          'l''id d''una alta des del client el genera el servidor');
select throws_ok($$ update public.wishlist set id = '30000000-0000-0000-0000-0000000000b0' where restaurant_name = 'Desitjat de Bob' $$,
                 'P0001', 'id és immutable', 'bob no pot canviar l''id d''un desitjat de G1');
select lives_ok($$ update public.wishlist set notes = 'Editat per bob' where restaurant_name = 'Desitjat de Bob' $$,
                'bob (membre) pot editar un desitjat de G1 sense tocar-ne l''id');
-- Atac 18: perfil i grup
select throws_ok($$ update public.profiles set active_group_id = '10000000-0000-0000-0000-000000000002'
                    where id = '00000000-0000-0000-0000-00000000000b' $$,
                 '42501', null, 'bob no pot activar un grup del qual no és membre');
select throws_ok($$ delete from public.profiles where id = '00000000-0000-0000-0000-00000000000b' $$,
                 '42501', null, 'bob no pot esborrar el seu perfil');
select throws_ok($$ update public.profiles set photo_url = 'https://x.y/z.png' where id = '00000000-0000-0000-0000-00000000000b' $$,
                 '42501', null, 'bob no pot editar la foto del seu perfil');
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
select is((select read_by from public.alerts
           where group_id = '10000000-0000-0000-0000-000000000001' and type = 'restaurant_added'
             and message like '%"A personal 1"%'),
          '{}'::uuid[],
          'l''alerta generada pel trigger comença amb read_by buit (l''autor no es pre-marca)');
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
select ok(exists (select 1 from public.alerts
                   where group_id = '10000000-0000-0000-0000-000000000001' and type = 'owner_changed'
                     and user_id = '00000000-0000-0000-0000-00000000000a'
                     and message = 'Alice ha cedit el grup "G1" a Bob.'),
          'cedir el grup genera una alerta owner_changed');

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
select ok(exists (select 1 from public.alerts
                   where group_id = '10000000-0000-0000-0000-000000000001' and type = 'group_left'
                     and user_id = '00000000-0000-0000-0000-00000000000b'
                     and message = 'Bob ha sortit del grup "G1".'),
          'sortir del grup genera una alerta group_left');

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
select ok(exists (select 1 from public.alerts
                   where group_id = '10000000-0000-0000-0000-000000000001' and type = 'owner_changed'
                     and user_id is null and message = 'Carol és el nou creador del grup "G1".'),
          'esborrar l''owner avisa el grup del nou creador');
select ok(exists (select 1 from public.alerts
                   where group_id = '10000000-0000-0000-0000-000000000001' and type = 'group_left'
                     and user_id is null and message = 'Alice ha esborrat el compte i ja no és al grup "G1".'),
          'esborrar un compte avisa els grups on queden membres');
select is((select count(*)::int from public.alerts
            where group_id = '10000000-0000-0000-0000-000000000001' and type = 'group_left'
              and message like 'Alice ha sortit%'), 0,
          'esborrar un compte no genera també l''alerta de sortida normal');

-- ------------------------------------------------------------ Esborrat del propi compte
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'anònim: no pot cridar delete_my_account');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
set local role authenticated;
select lives_ok($$ select public.delete_my_account() $$, 'carol esborra el seu propi compte');
reset role;
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000c'), 0,
          'delete_my_account esborra l''usuari que la crida');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 0,
          'delete_my_account esborra el seu perfil');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000d'), 1,
          'delete_my_account no toca els altres usuaris');
select is((select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000002'), 0,
          'esborrar el compte de l''owner d''un grup sense més membres s''endu el grup (protect_group_owner no ho impedeix)');

-- ------------------------------------------------------------ Visites (G3, propietat d'alice2)
-- Les proves d'esborrat de comptes han eliminat G1 (carol n'era l'última membre i el grup ha caigut pel cascade).
-- Les proves de visites fan servir un grup nou, G3, amb usuaris nous (alice2 n'és la propietària).

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice2@test.dev', '{"full_name":"Alice2"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'bob2@test.dev', '{"full_name":"Bob2"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000003', 'G3', 'GGGGGG', '00000000-0000-0000-0000-0000000000a1', 'Alice2');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1');

insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003',
   'Visites test', '00000000-0000-0000-0000-0000000000a1');

-- ---- Com a Alice2 (propietària de G3)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

-- Pot registrar una visita grupal
select lives_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date, 4.0, 'Molt bé!',
    array['00000000-0000-0000-0000-0000000000a1'::uuid], true, null)
$$, 'alice2 pot registrar una visita grupal');

-- Visita privada d'alice2
select lives_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date - 7, 3.5, 'Privada',
    '{}'::uuid[], false, null)
$$, 'alice2 pot registrar una visita privada');

-- Comprova que s'han creat les dues visites
select is((select count(*)::int from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000010'), 2,
          'hi ha dues visites al restaurant de prova');

-- No es pot escriure a la taula directament
select throws_ok($$
  insert into public.restaurant_visits (restaurant_id, group_id, created_by)
  values ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003',
          '00000000-0000-0000-0000-0000000000a1')
$$, '42501', null, 'no es pot inserir a restaurant_visits directament des del client');

-- La visita grupal genera una alerta restaurant_reviewed
select is((select count(*)::int from public.alerts
           where group_id = '10000000-0000-0000-0000-000000000003'
             and type = 'restaurant_reviewed'
             and message like '%"Visites test"%'), 2,
          'les dues visites han generat alertes restaurant_reviewed');

reset role;

-- ---- Com a Bob2 (membre de G3)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;

-- Bob2 veu les dues visites (inclosa la privada d'alice2)
select is((select count(*)::int from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000010'), 2,
          'bob2 veu totes dues visites (inclosa la privada d''alice2)');

-- Bob2 pot editar la visita grupal d'alice2
select lives_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date, 4.5, 'Actualitzat per bob2',
    array['00000000-0000-0000-0000-0000000000b1'::uuid], true,
    (select id from public.restaurant_visits
     where restaurant_id = '20000000-0000-0000-0000-000000000010'
       and shared = true limit 1))
$$, 'bob2 pot editar la visita grupal d''alice2');

-- Bob2 no pot editar la visita privada d'alice2
select throws_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date, 2.0, 'Intent de hackear',
    '{}'::uuid[], false,
    (select id from public.restaurant_visits
     where restaurant_id = '20000000-0000-0000-0000-000000000010'
       and shared = false limit 1))
$$, 'P0001', null, 'bob2 no pot editar la visita privada d''alice2 (atac visita privada)');

-- Bob2 no pot canviar shared de la visita privada d'alice2
select throws_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date, 2.0, 'Intent canviar shared',
    '{}'::uuid[], true,
    (select id from public.restaurant_visits
     where restaurant_id = '20000000-0000-0000-0000-000000000010'
       and shared = false limit 1))
$$, 'P0001', null, 'bob2 no pot canviar shared d''una visita privada d''alice2');

-- Assistent fora del grup
select throws_ok($$
  select public.save_visit(
    '20000000-0000-0000-0000-000000000010'::uuid,
    current_date, 3.0, '',
    array['00000000-0000-0000-0000-00000000000d'::uuid], true, null)
$$, 'P0001', null, 'no es pot posar com a assistent algú que no és membre del grup');

reset role;

-- Esborrar el restaurant esborra les visites
delete from public.restaurants where id = '20000000-0000-0000-0000-000000000010';
select is((select count(*)::int from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000010'), 0,
          'esborrar el restaurant esborra les seves visites (cascade)');

-- move_to_group arrossega les visites; copy_to_groups no les copia
insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000011', null, 'Moure amb visites', '00000000-0000-0000-0000-0000000000a1');
insert into public.restaurant_visits (restaurant_id, group_id, created_by)
values ('20000000-0000-0000-0000-000000000011', null, '00000000-0000-0000-0000-0000000000a1');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
select lives_ok($$
  select public.move_to_group('restaurant', '20000000-0000-0000-0000-000000000011',
                               '10000000-0000-0000-0000-000000000003')
$$, 'alice2 mou un restaurant personal amb visites a G3');
select is((select group_id from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000011'),
          '10000000-0000-0000-0000-000000000003'::uuid,
          'move_to_group arrossega les visites al grup nou');

-- copy_to_groups: les visites no es copien
select throws_ok($$ select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000011',
                                                 array['10000000-0000-0000-0000-000000000002']::uuid[]) $$,
                 'P0001', null, 'alice2 no pot copiar a G2 (no és membre)');
reset role;

-- ------------------------------------------------------------ Visites a l'espai personal
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
-- Com a postgres: des del client, l'id el genera el servidor (0019).
insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000012', null, 'Personal visites', '00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select lives_ok($$
  select public.save_visit('20000000-0000-0000-0000-000000000012'::uuid,
    current_date, 4.0, '', '{}'::uuid[], true, null)
$$, 'alice2 pot registrar una visita al seu espai personal');

-- Afegir alice2 com a assistent al seu propi restaurant personal és vàlid
select lives_ok($$
  select public.save_visit('20000000-0000-0000-0000-000000000012'::uuid,
    current_date, 4.0, '', array['00000000-0000-0000-0000-0000000000a1'::uuid], true, null)
$$, 'a l''espai personal alice2 es pot afegir ella mateixa com a assistent');

-- Un altre usuari no pot constar com a assistent a l'espai personal d'alice2
select throws_ok($$
  select public.save_visit('20000000-0000-0000-0000-000000000012'::uuid,
    current_date, 4.0, '', array['00000000-0000-0000-0000-0000000000b1'::uuid], true, null)
$$, 'P0001', null, 'a l''espai personal no es pot afegir un altre usuari com a assistent');

-- Bob2 no veu ni pot modificar les visites de l'espai personal d'alice2
select is((select count(*)::int from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000012'), 2,
          'alice2 veu les seves visites personals');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;
select is((select count(*)::int from public.restaurant_visits
           where restaurant_id = '20000000-0000-0000-0000-000000000012'), 0,
          'bob2 no veu les visites personals d''alice2');
reset role;

-- ------------------------------------------------------------ Canvi de nickname (sync_nickname_to_records)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

select lives_ok($$ select public.create_group('Grup d''Alice2') $$, 'alice2 crea un grup');
insert into public.wishlist (group_id, restaurant_name, user_id) values
  (null, 'Desitjat d''Alice2', '00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ update public.profiles set nickname = 'Alícia' where id = '00000000-0000-0000-0000-0000000000a1' $$,
                'alice2 canvia el seu nickname');
reset role;

select is((select count(*)::int from public.restaurants
           where created_by = '00000000-0000-0000-0000-0000000000a1' and created_by_name is distinct from 'Alícia'), 0,
          'el nickname nou s''aplica als restaurants de l''autora');
select is((select count(*)::int from public.restaurant_visits
           where created_by = '00000000-0000-0000-0000-0000000000a1' and created_by_name is distinct from 'Alícia'), 0,
          'el nickname nou s''aplica a les visites de l''autora');
select is((select count(*)::int from public.wishlist
           where user_id = '00000000-0000-0000-0000-0000000000a1' and user_name is distinct from 'Alícia'), 0,
          'el nickname nou s''aplica als desitjats de l''autora');
select is((select array_agg(owner_name order by name) from public.groups where owner_id = '00000000-0000-0000-0000-0000000000a1'),
          array['Alícia', 'Alícia'],
          'el nickname nou s''aplica a l''owner_name dels seus grups (G3 i el grup creat)');
select isnt((select created_by_name from public.restaurants where name = 'Nom fals'), 'Alícia',
            'el canvi de nickname no toca els registres d''altres usuaris');

-- ------------------------------------------------------------ Conversió de desitjat a restaurant
insert into public.wishlist (id, group_id, restaurant_name, cuisine, notes, recommended_by, user_id) values
  ('30000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', 'Desitjat G3', 'Catalana',
   'Recomanat per la Maria', 'La Maria', '00000000-0000-0000-0000-0000000000b1'),
  ('30000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000003', 'Desitjat G3 bis', '',
   null, null, '00000000-0000-0000-0000-0000000000b1'),
  ('30000000-0000-0000-0000-000000000033', null, 'Desitjat personal d''Alice2', '',
   null, null, '00000000-0000-0000-0000-0000000000a1');
-- Desitjat convertit abans de 0002 que no s'ha pogut associar a cap restaurant
insert into public.wishlist (id, group_id, restaurant_name, status, user_id) values
  ('30000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000003', 'Provat antic G3', 'visited',
   '00000000-0000-0000-0000-0000000000b1');

set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000031', current_date, 4.0, '', '{}')
$$, '42501', null, 'anònim: no pot cridar convert_wishlist_to_restaurant');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

select lives_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000031', current_date, 4.5, 'Molt bo',
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1']::uuid[], true)
$$, 'alice2 converteix un desitjat de G3 (d''un altre membre) en restaurant');
select is((select count(*)::int from public.wishlist where id = '30000000-0000-0000-0000-000000000031'), 0,
          'el desitjat convertit s''esborra');
select ok((select wish_fulfilled_at is not null and recommended_by = 'La Maria' from public.restaurants where name = 'Desitjat G3'),
          'el restaurant guarda quan es va complir el desig i qui el va recomanar');
reset role;
select is((select count(*)::int from public.group_changes where item_id = '30000000-0000-0000-0000-000000000031'), 0,
          'esborrar el desitjat en convertir-lo no queda a l''historial (no es pot desfer)');
set local role authenticated;
select is((select row(group_id, cuisine::text, notes, created_by)::text from public.restaurants where name = 'Desitjat G3'),
          row('10000000-0000-0000-0000-000000000003'::uuid, 'Catalana', '(Desitjat original: Recomanat per la Maria)',
              '00000000-0000-0000-0000-0000000000a1'::uuid)::text,
          'el restaurant es crea al grup del desitjat amb les seves dades i alice2 com a autora');
select is((select count(*)::int from public.restaurant_visits v join public.restaurants r on r.id = v.restaurant_id
            join public.visit_attendees a on a.visit_id = v.id
            where r.name = 'Desitjat G3' and v.rating = 4.5 and v.notes = 'Molt bo'), 2,
          'la conversió registra la visita amb els seus assistents');
select throws_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000031', current_date, 4.0, '', '{}')
$$, 'P0001', 'Desitjat no trobat', 'un desitjat no es pot convertir dues vegades');
select throws_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000034', current_date, 4.0, '', '{}')
$$, 'P0001', 'Aquest desitjat ja s''ha convertit en restaurant', 'un desitjat provat d''abans de 0002 no es pot tornar a convertir');
select lives_ok($$
  insert into public.restaurants (group_id, name, created_by, wish_fulfilled_at, recommended_by)
  values ('10000000-0000-0000-0000-000000000003', 'Origen fals', '00000000-0000-0000-0000-0000000000a1', now(), 'Ningú')
$$, 'alice2 crea un restaurant intentant fixar-ne l''origen');
select ok((select wish_fulfilled_at is null and recommended_by is null from public.restaurants where name = 'Origen fals'),
          'el client no pot fixar l''origen d''un restaurant en crear-lo');
select throws_ok($$
  update public.restaurants set wish_fulfilled_at = null where name = 'Desitjat G3'
$$, 'P0001', 'L''origen del restaurant és immutable', 'el client no pot esborrar la data del desig complert');
select throws_ok($$
  update public.restaurants set recommended_by = 'Un altre' where name = 'Desitjat G3'
$$, 'P0001', 'L''origen del restaurant és immutable', 'el client no pot canviar qui el va recomanar');
select lives_ok($$
  delete from public.wishlist where id = '30000000-0000-0000-0000-000000000034'
$$, 'alice2 esborra a mà un desitjat del grup');
reset role;
select is((select count(*)::int from public.group_changes where item_id = '30000000-0000-0000-0000-000000000034' and action = 'delete'), 1,
          'esborrar un desitjat a mà sí que queda a l''historial');
set local role authenticated;
select throws_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000032', current_date, 4.0, '',
    array['00000000-0000-0000-0000-0000000000e9']::uuid[])
$$, 'P0001', 'Els assistents han de ser membres del grup', 'la conversió valida els assistents com save_visit');
select is((select status from public.wishlist where id = '30000000-0000-0000-0000-000000000032'), 'pending',
          'si la visita falla, el desitjat continua pendent (atomicitat)');
select is((select count(*)::int from public.restaurants where name = 'Desitjat G3 bis'), 0,
          'si la visita falla, no queda cap restaurant creat (atomicitat)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;
select throws_ok($$
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000033', current_date, 4.0, '', '{}')
$$, 'P0001', 'Desitjat no trobat', 'bob2 no pot convertir un desitjat personal d''alice2');
reset role;
select is((select status from public.wishlist where id = '30000000-0000-0000-0000-000000000033'), 'pending',
          'el desitjat personal d''alice2 no ha canviat');

-- ------------------------------------------------------------ Enduriment (0011): expulsions, nickname i perfil propi
-- F1 = frank (propietari de G4), F2 = gina i F3 = hugo (membres de G4)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'frank@test.dev', '{"full_name":"Frank"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'gina@test.dev', '{"full_name":"Gina"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'hugo@test.dev', '{"full_name":"Hugo"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000004', 'G4', 'HHHHHH', '00000000-0000-0000-0000-0000000000f1', 'Frank');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f1'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f2'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f3');
update public.profiles set active_group_id = '10000000-0000-0000-0000-000000000004'
 where id = '00000000-0000-0000-0000-0000000000f1';

-- ---- Com a Gina (membre de G4)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
set local role authenticated;

select is((select nickname from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'), 'Frank',
          'gina veu el nickname de frank (company de grup)');
select is((select array_agg(id) from public.get_my_profile()), array['00000000-0000-0000-0000-0000000000f2'::uuid],
          'get_my_profile() només retorna el perfil propi');

-- 0014: els companys només llegeixen les columnes públiques del perfil
select throws_ok($$ select last_login_at from public.profiles where id = '00000000-0000-0000-0000-0000000000f1' $$,
                 '42501', null, 'gina no pot llegir el last_login_at de frank');
select throws_ok($$ select active_group_id from public.profiles where id = '00000000-0000-0000-0000-0000000000f1' $$,
                 '42501', null, 'gina no pot llegir l''active_group_id de frank');
select throws_ok($$ select * from public.profiles $$, '42501', null,
                 'select * a profiles es rebutja (cal get_my_profile per al perfil propi)');
select isnt((select last_login_at from public.get_my_profile()), null,
            'get_my_profile() continua retornant les columnes privades del perfil propi');
select lives_ok($$ update public.profiles set last_login_at = now(), active_group_id = '10000000-0000-0000-0000-000000000004'
                    where id = '00000000-0000-0000-0000-0000000000f2' $$,
                'gina continua podent actualitzar el seu espai actiu i l''últim accés');

select lives_ok($$ update public.profiles set nickname = 'Gina Nova' where id = '00000000-0000-0000-0000-0000000000f2' $$,
                'gina canvia el nickname');
select throws_ok($$ update public.profiles set nickname = 'Gina Altra' where id = '00000000-0000-0000-0000-0000000000f2' $$,
                 'OMQ01', null, 'no es pot tornar a canviar el nickname abans d''un minut');
select lives_ok($$ update public.profiles set nickname = 'Gina Nova', avatar = '🍣' where id = '00000000-0000-0000-0000-0000000000f2' $$,
                'desar el perfil amb el mateix nickname no compta com a canvi');
select throws_ok($$ update public.profiles set avatar = repeat('🍕', 17) where id = '00000000-0000-0000-0000-0000000000f2' $$,
                 '23514', null, 'l''avatar té com a màxim 16 caràcters');
select throws_ok($$ update public.profiles set avatar = '' where id = '00000000-0000-0000-0000-0000000000f2' $$,
                 '23514', null, 'l''avatar no pot ser buit');
select lives_ok($$ update public.profiles set avatar = '👨‍👩‍👧‍👦' where id = '00000000-0000-0000-0000-0000000000f2' $$,
                'un emoji compost cap a l''avatar');

select lives_ok($$ delete from public.group_members
                    where group_id = '10000000-0000-0000-0000-000000000004'
                      and user_id = '00000000-0000-0000-0000-0000000000f2' $$,
                'gina surt de G4');
reset role;
select is((select code from public.groups where id = '10000000-0000-0000-0000-000000000004'), 'HHHHHH',
          'sortir un mateix del grup no canvia el codi');

-- ---- Com a Frank (propietari de G4)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
set local role authenticated;

select lives_ok($$ delete from public.group_members
                    where group_id = '10000000-0000-0000-0000-000000000004'
                      and user_id = '00000000-0000-0000-0000-0000000000f3' $$,
                'frank expulsa hugo');
select ok(exists (select 1 from public.alerts
                   where group_id = '10000000-0000-0000-0000-000000000004' and type = 'group_left'
                     and user_id = '00000000-0000-0000-0000-0000000000f1' and message like '% ha expulsat % del grup "%'),
          'expulsar un membre genera una alerta group_left amb l''autor de l''expulsió');
select isnt((select code from public.groups where id = '10000000-0000-0000-0000-000000000004'), 'HHHHHH',
            'expulsar un membre canvia el codi d''invitació');
select is((select (public.create_group('Grup de Frank')).name), 'Grup de Frank', 'frank crea un grup');
select is((select count(*)::int from public.alerts a join public.groups g on g.id = a.group_id
            where g.name = 'Grup de Frank' and a.message like '%' || g.code || '%'), 0,
          'l''alerta de grup creat no inclou el codi d''invitació');
reset role;

-- ---- Com a Hugo (expulsat de G4)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
set local role authenticated;

select is(public.join_group_by_code('HHHHHH') ->> 'error', 'GROUP_NOT_FOUND',
          'l''expulsat no pot tornar a entrar amb el codi antic');
reset role;

-- ------------------------------------------------------------ Realtime amb Broadcast privat (G6, propietat de Rita)
-- Rita és l'owner de G6, Sergi s'hi uneix amb el codi i Tomàs no hi és. Realtime llegeix realtime.messages amb el rol
-- de qui escolta i realtime.topic() = el topic del canal: els tests fixen aquest paràmetre abans de cada lectura.
select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'), 0,
          'cap taula de l''app és a la publicació de postgres_changes (els DELETE no passaven per RLS)');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a5', 'rita@test.dev', '{"full_name":"Rita"}'),
  ('00000000-0000-0000-0000-0000000000b5', 'sergi@test.dev', '{"full_name":"Sergi"}'),
  ('00000000-0000-0000-0000-0000000000c5', 'tomas@test.dev', '{"full_name":"Tomàs"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000006', 'G6', 'RRRRRR', '00000000-0000-0000-0000-0000000000a5', 'Rita');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a5');
insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000060', '10000000-0000-0000-0000-000000000006', 'G6 resto 1', '00000000-0000-0000-0000-0000000000a5'),
  ('20000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000006', 'G6 resto 2', '00000000-0000-0000-0000-0000000000a5'),
  ('20000000-0000-0000-0000-000000000062', null, 'Rita personal', '00000000-0000-0000-0000-0000000000a5');

-- ---- Com a Rita (propietària de G6)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a5', true);
set local role authenticated;
update public.restaurants set notes = 'Avís' where group_id = '10000000-0000-0000-0000-000000000006';
update public.restaurants set notes = 'Avís' where id = '20000000-0000-0000-0000-000000000062';
reset role;

select is((select array_agg(payload - 'id') from realtime.messages
            where topic = 'group:10000000-0000-0000-0000-000000000006' and event = 'change'
              and payload ->> 'table' = 'restaurants'),
          array['{"table": "restaurants"}'::jsonb, '{"table": "restaurants"}'::jsonb],
          'afegir dos restaurants al grup i després editar-los (dues sentències) envia un avís per sentència, sense dades de les files');
select ok(exists (select 1 from realtime.messages
                   where topic = 'user:00000000-0000-0000-0000-0000000000a5' and payload ->> 'table' = 'restaurants'),
          'editar un restaurant personal avisa el topic de l''usuari');
select ok(not exists (select 1 from realtime.messages
                       where topic = 'group:10000000-0000-0000-0000-000000000006' and private = false),
          'tots els avisos van a canals privats');

-- ---- Com a Sergi: s'uneix a G6
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b5","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b5', true);
set local role authenticated;
select is(public.join_group_by_code('RRRRRR') ->> 'already_member', 'false', 'sergi s''uneix a G6');
reset role;
select is((select array_agg(distinct topic order by topic) from realtime.messages where payload ->> 'table' = 'group_members'
            and topic in ('user:00000000-0000-0000-0000-0000000000a5', 'user:00000000-0000-0000-0000-0000000000b5')),
          array['user:00000000-0000-0000-0000-0000000000a5', 'user:00000000-0000-0000-0000-0000000000b5'],
          'entrar a un grup avisa qui hi entra i els membres que ja hi eren');

set local role authenticated;
select set_config('realtime.topic', 'group:10000000-0000-0000-0000-000000000006', true);
select ok((select count(*) from realtime.messages where topic = 'group:10000000-0000-0000-0000-000000000006') > 0,
          'sergi (membre) pot escoltar el canal de G6');
select set_config('realtime.topic', 'user:00000000-0000-0000-0000-0000000000b5', true);
select ok((select count(*) from realtime.messages where topic = 'user:00000000-0000-0000-0000-0000000000b5') > 0,
          'sergi pot escoltar el seu canal d''usuari');
select set_config('realtime.topic', 'user:00000000-0000-0000-0000-0000000000a5', true);
select is((select count(*)::int from realtime.messages where topic = 'user:00000000-0000-0000-0000-0000000000a5'), 0,
          'sergi no pot escoltar el canal d''usuari de rita');
select throws_ok($$
  insert into realtime.messages (topic, extension, event, payload, private)
  values ('group:10000000-0000-0000-0000-000000000006', 'broadcast', 'change', '{"table": "restaurants"}', true)
$$, '42501', null, 'un membre no pot enviar avisos falsos al canal del grup');
reset role;

-- ---- Com a Tomàs (aliè a G6)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c5', true);
set local role authenticated;
select set_config('realtime.topic', 'group:10000000-0000-0000-0000-000000000006', true);
select is((select count(*)::int from realtime.messages where topic = 'group:10000000-0000-0000-0000-000000000006'), 0,
          'tomàs no pot escoltar el canal d''un grup on no és');
select is(public.can_receive_topic('group:no-es-un-uuid'), false, 'un topic mal format no es pot escoltar');
reset role;

set local role anon;
select set_config('realtime.topic', 'group:10000000-0000-0000-0000-000000000006', true);
select is((select count(*)::int from realtime.messages), 0, 'anònim: no pot escoltar cap canal');
reset role;
select set_config('realtime.topic', '', true);

-- ------------------------------------------------------------ Historial de canvis (G5, propietat d'Iris)
-- Iris és l'owner de G5, Joan n'és membre i Kai no hi és. Les altes no es registren: les dades es creen aquí.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'iris@test.dev', '{"full_name":"Iris"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'joan@test.dev', '{"full_name":"Joan"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'kai@test.dev', '{"full_name":"Kai"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000005', 'G5', 'IIIIII', '00000000-0000-0000-0000-0000000000d1', 'Iris');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000d1'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000d2');
insert into public.restaurants (id, group_id, name, rating, notes, created_by) values
  ('20000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000005', 'Can Joan', null, null,
   '00000000-0000-0000-0000-0000000000d2'),
  ('20000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000005', 'Ca la Iris', 4.0, 'Bo',
   '00000000-0000-0000-0000-0000000000d1'),
  ('20000000-0000-0000-0000-000000000052', null, 'Joan personal', null, null, '00000000-0000-0000-0000-0000000000d2');
insert into public.wishlist (id, group_id, restaurant_name, user_id) values
  ('30000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000005', 'Desitjat G5',
   '00000000-0000-0000-0000-0000000000d1');
insert into public.restaurant_visits (id, restaurant_id, group_id, visited_on, rating, shared, created_by) values
  ('50000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000005',
   current_date, 4.0, true, '00000000-0000-0000-0000-0000000000d1'),
  ('50000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000050', '10000000-0000-0000-0000-000000000005',
   current_date, 2.0, false, '00000000-0000-0000-0000-0000000000d2');
insert into public.visit_attendees (visit_id, user_id) values
  ('50000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-0000000000d1'),
  ('50000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-0000000000d2');
-- Totes les proves són a la mateixa transacció (now() no canvia): les alertes de les altes passen a ahir per
-- poder comprovar que recuperar un element no en crea de noves.
update public.alerts set created_at = now() - interval '1 day' where group_id = '10000000-0000-0000-0000-000000000005';

-- ---- Com a Joan (membre de G5)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
set local role authenticated;

update public.restaurants set rating = 2.0, notes = 'Bo', name = 'Ca la Iris' where id = '20000000-0000-0000-0000-000000000051';
select is((select array[old_data, new_data] from public.group_changes where item_id = '20000000-0000-0000-0000-000000000051'),
          array['{"rating": 4.0}'::jsonb, '{"rating": 2.0}'::jsonb],
          'editar un restaurant del grup desa només els camps canviats, abans i després');
select is((select changed_by_name from public.group_changes where item_id = '20000000-0000-0000-0000-000000000051'), 'Joan',
          'l''entrada de l''historial desa qui ha fet el canvi');
update public.restaurants set notes = 'Bo' where id = '20000000-0000-0000-0000-000000000051';
select is((select count(*)::int from public.group_changes where item_id = '20000000-0000-0000-0000-000000000051'), 1,
          'desar un restaurant sense canvis no afegeix cap entrada');
update public.restaurants set notes = 'Canviat' where id = '20000000-0000-0000-0000-000000000052';
select is((select count(*)::int from public.group_changes where item_id = '20000000-0000-0000-0000-000000000052'), 0,
          'l''espai personal no té historial');
update public.wishlist set status = 'planned' where id = '30000000-0000-0000-0000-000000000050';
select is((select old_data ->> 'status' from public.group_changes where item_id = '30000000-0000-0000-0000-000000000050'),
          'pending', 'editar un desitjat del grup queda a l''historial');

select throws_ok($$
  insert into public.group_changes (group_id, item_type, item_id, action, old_data)
  values ('10000000-0000-0000-0000-000000000005', 'restaurant', gen_random_uuid(), 'delete', '{}')
$$, '42501', null, 'no es poden inserir entrades falses a l''historial');
select throws_ok($$ update public.group_changes set restored_at = now() $$, '42501', null,
                 'no es pot editar l''historial directament');
select throws_ok($$ delete from public.group_changes $$, '42501', null, 'no es pot esborrar l''historial directament');

select lives_ok($$
  select public.save_visit('20000000-0000-0000-0000-000000000050', current_date, 3.0, '',
                           array['00000000-0000-0000-0000-0000000000d2'::uuid], true,
                           '50000000-0000-0000-0000-000000000051')
$$, 'joan edita la visita grupal d''iris');
select is((select old_data from public.group_changes
            where item_id = '50000000-0000-0000-0000-000000000051' and action = 'update'),
          '{"rating": 4.0, "attendees": ["00000000-0000-0000-0000-0000000000d1", "00000000-0000-0000-0000-0000000000d2"]}'::jsonb,
          'editar una visita desa la valoració i els assistents anteriors');
select lives_ok($$ select public.delete_visit('50000000-0000-0000-0000-000000000051') $$, 'joan esborra la visita grupal');
select is((select old_data ->> 'rating' from public.group_changes
            where item_id = '50000000-0000-0000-0000-000000000051' and action = 'delete'),
          '3.0', 'esborrar una visita desa la visita sencera');

delete from public.restaurants where id = '20000000-0000-0000-0000-000000000050';
select is((select jsonb_array_length(old_data -> 'visits') from public.group_changes
            where item_id = '20000000-0000-0000-0000-000000000050' and action = 'delete'),
          1, 'esborrar un restaurant desa el restaurant amb les visites que li quedaven');
select is((select count(*)::int from public.group_changes where item_id = '50000000-0000-0000-0000-000000000052'), 0,
          'les visites que cauen amb el restaurant no tenen entrada pròpia');
reset role;

-- ---- Com a Kai (aliè a G5)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d3', true);
set local role authenticated;

select is((select count(*)::int from public.group_changes where group_id = '10000000-0000-0000-0000-000000000005'), 0,
          'kai no veu l''historial d''un grup on no és');
select throws_ok($$
  select public.restore_group_change((select id from public.group_changes
                                       where item_id = '20000000-0000-0000-0000-000000000050'))
$$, 'P0001', 'Canvi no trobat', 'kai no pot desfer canvis d''un grup on no és');
reset role;
select throws_ok(format('select public.restore_group_change(%L)',
                        (select id from public.group_changes where item_id = '20000000-0000-0000-0000-000000000050')),
                 'P0001', 'Canvi no trobat', 'kai no pot desfer un canvi encara que en sàpiga l''identificador');

set local role anon;
select throws_ok($$ select public.restore_group_change(gen_random_uuid()) $$, '42501', null,
                 'anònim: no pot cridar restore_group_change');
reset role;

-- ---- Com a Iris (propietària de G5)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
set local role authenticated;

select is((select count(*)::int from public.group_changes where group_id = '10000000-0000-0000-0000-000000000005'), 5,
          'iris veu les cinc entrades de l''historial del grup');
select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes where item_id = '20000000-0000-0000-0000-000000000050')),
                'iris recupera el restaurant que joan ha esborrat');
select is((select created_by from public.restaurants where id = '20000000-0000-0000-0000-000000000050'),
          '00000000-0000-0000-0000-0000000000d2'::uuid, 'el restaurant recuperat conserva l''autor original');
select is((select array_agg(id) from public.restaurant_visits where restaurant_id = '20000000-0000-0000-0000-000000000050'),
          array['50000000-0000-0000-0000-000000000052'::uuid], 'el restaurant recuperat torna amb les seves visites');
select is((select count(*)::int from public.alerts where group_id = '10000000-0000-0000-0000-000000000005' and created_at = now()), 0,
          'recuperar un element no genera alertes d''alta');
select is((select restored_by_name from public.group_changes
            where item_id = '20000000-0000-0000-0000-000000000050' and action = 'delete'), 'Iris',
          'l''entrada desfeta desa qui l''ha desfet');
select throws_ok(format('select public.restore_group_change(%L)',
                        (select id from public.group_changes where item_id = '20000000-0000-0000-0000-000000000050')),
                 'P0001', 'Aquest canvi ja s''ha desfet', 'un canvi només es pot desfer un cop');

select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes where item_id = '20000000-0000-0000-0000-000000000051')),
                'iris desfà l''edició de joan');
select is((select rating from public.restaurants where id = '20000000-0000-0000-0000-000000000051'), 4.0::numeric,
          'desfer una edició torna el camp al valor anterior');
select is((select count(*)::int from public.group_changes
            where item_id = '20000000-0000-0000-0000-000000000051' and changed_by = '00000000-0000-0000-0000-0000000000d1'), 1,
          'desfer una edició queda a l''historial com una edició més');

select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes
                         where item_id = '50000000-0000-0000-0000-000000000051' and action = 'delete')),
                'iris recupera la visita esborrada');
select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes
                         where item_id = '50000000-0000-0000-0000-000000000051' and action = 'update')),
                'iris desfà l''edició de la visita');
select is((select array[v.rating::text, (select string_agg(a.user_id::text, ',' order by a.user_id)
                                          from public.visit_attendees a where a.visit_id = v.id)]
             from public.restaurant_visits v where v.id = '50000000-0000-0000-0000-000000000051'),
          array['4.0', '00000000-0000-0000-0000-0000000000d1,00000000-0000-0000-0000-0000000000d2'],
          'la visita recupera la valoració i els assistents d''abans de l''edició');

delete from public.wishlist where id = '30000000-0000-0000-0000-000000000050';
reset role;

-- ---- Com a Joan: visites privades i desitjats
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
set local role authenticated;

select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes
                         where item_id = '30000000-0000-0000-0000-000000000050' and action = 'delete')),
                'joan recupera el desitjat que iris ha esborrat');
select is((select status from public.wishlist where id = '30000000-0000-0000-0000-000000000050'), 'planned',
          'el desitjat recuperat torna tal com era');
select lives_ok($$ select public.delete_visit('50000000-0000-0000-0000-000000000052') $$, 'joan esborra la seva visita privada');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
set local role authenticated;
select throws_ok(format('select public.restore_group_change(%L)',
                        (select id from public.group_changes where item_id = '50000000-0000-0000-0000-000000000052')),
                 'P0001', 'Només l''autor pot recuperar una visita privada',
                 'iris no pot recuperar la visita privada de joan');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
set local role authenticated;
select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes where item_id = '50000000-0000-0000-0000-000000000052')),
                'joan recupera la seva visita privada');
reset role;

-- ---- Esborrar el grup
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
set local role authenticated;
select lives_ok($$ delete from public.groups where id = '10000000-0000-0000-0000-000000000005' $$,
                'iris esborra G5 amb tot el contingut');
reset role;
select is((select count(*)::int from public.group_changes where group_id = '10000000-0000-0000-0000-000000000005'), 0,
          'esborrar el grup s''endu l''historial i no en crea cap entrada');

-- ------------------------------------------------------------ Esborrar després de sortir del grup (G8, propietat de Pau)
-- Quim surt del grup i Rut n'és expulsada: cap dels dos pot esborrar el que hi havia afegit. Sara continua sent-ne
-- membre i Pau n'és l'owner. Els DELETE sense WHERE no apliquen la política de lectura: només els frena la d'esborrat.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c8', 'pau@test.dev', '{"full_name":"Pau"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'quim@test.dev', '{"full_name":"Quim"}'),
  ('00000000-0000-0000-0000-0000000000ca', 'rut@test.dev', '{"full_name":"Rut"}'),
  ('00000000-0000-0000-0000-0000000000cb', 'sara@test.dev', '{"full_name":"Sara"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000008', 'G8', 'PPPPPP', '00000000-0000-0000-0000-0000000000c8', 'Pau');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000c8'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000c9'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000ca'),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000cb');
insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000080', '10000000-0000-0000-0000-000000000008', 'De Quim 1', '00000000-0000-0000-0000-0000000000c9'),
  ('20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000008', 'De Quim 2', '00000000-0000-0000-0000-0000000000c9'),
  ('20000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000008', 'De Rut', '00000000-0000-0000-0000-0000000000ca'),
  ('20000000-0000-0000-0000-000000000083', '10000000-0000-0000-0000-000000000008', 'De Sara', '00000000-0000-0000-0000-0000000000cb'),
  ('20000000-0000-0000-0000-000000000084', null, 'Quim personal', '00000000-0000-0000-0000-0000000000c9');
insert into public.wishlist (id, group_id, restaurant_name, user_id) values
  ('30000000-0000-0000-0000-000000000080', '10000000-0000-0000-0000-000000000008', 'Desitjat de Quim', '00000000-0000-0000-0000-0000000000c9'),
  ('30000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000008', 'Desitjat de Rut', '00000000-0000-0000-0000-0000000000ca'),
  ('30000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000008', 'Desitjat de Sara', '00000000-0000-0000-0000-0000000000cb');
insert into public.restaurant_visits (id, restaurant_id, group_id, visited_on, rating, shared, created_by) values
  ('50000000-0000-0000-0000-000000000080', '20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000008',
   current_date, 3.0, false, '00000000-0000-0000-0000-0000000000c9');

-- L'owner no surt del grup ni quan el DELETE no passa per members_delete (p. ex. una sortida simultània a una cessió)
select throws_ok($$ delete from public.group_members
                    where group_id = '10000000-0000-0000-0000-000000000008' and user_id = '00000000-0000-0000-0000-0000000000c8' $$,
                 'P0001', 'L''owner no pot sortir del grup: cedeix-lo o esborra''l',
                 'protect_group_owner no deixa treure l''owner de group_members');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000cb', true);
set local role authenticated;
select throws_ok($$ select public.save_visit('20000000-0000-0000-0000-000000000081', current_date, 1.0, '', '{}', false,
                                             '50000000-0000-0000-0000-000000000080') $$,
                 'P0001', 'No pots editar aquesta visita', 'sara no pot editar la visita privada de quim mentre és al grup');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c9', true);
set local role authenticated;
select lives_ok($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000008' and user_id = '00000000-0000-0000-0000-0000000000c9' $$,
                'quim surt de G8');
select lives_ok($$
  delete from public.restaurants where id = '20000000-0000-0000-0000-000000000080';
  delete from public.restaurants where true;
  with pgrst_source as (delete from public.wishlist returning 1) select count(*) from pgrst_source;
  delete from public.restaurants;
  delete from public.wishlist
$$, 'quim intenta esborrar el que havia afegit a G8, amb WHERE, sense i amb la forma de PostgREST');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c8","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c8', true);
set local role authenticated;
select lives_ok($$ delete from public.group_members
                   where group_id = '10000000-0000-0000-0000-000000000008' and user_id = '00000000-0000-0000-0000-0000000000ca' $$,
                'pau expulsa rut de G8');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ca","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ca', true);
set local role authenticated;
select lives_ok($$
  delete from public.restaurants where id = '20000000-0000-0000-0000-000000000082';
  delete from public.restaurants;
  delete from public.wishlist where id = '30000000-0000-0000-0000-000000000081';
  delete from public.wishlist
$$, 'rut intenta esborrar el que havia afegit a G8, amb WHERE i sense');
reset role;

select is((select array_agg(name order by name)::text[] from public.restaurants
            where group_id = '10000000-0000-0000-0000-000000000008'),
          array['De Quim 1', 'De Quim 2', 'De Rut', 'De Sara'],
          'un ex-membre (sortit o expulsat) no pot esborrar els restaurants que havia afegit al grup');
select is((select array_agg(restaurant_name order by restaurant_name)::text[] from public.wishlist
            where group_id = '10000000-0000-0000-0000-000000000008'),
          array['Desitjat de Quim', 'Desitjat de Rut', 'Desitjat de Sara'],
          'un ex-membre (sortit o expulsat) no pot esborrar els desitjats que havia afegit al grup');
select is((select count(*)::int from public.restaurants where id = '20000000-0000-0000-0000-000000000084'), 0,
          'qui surt d''un grup continua podent esborrar el seu espai personal');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000cb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000cb', true);
set local role authenticated;
select isnt_empty($$ delete from public.restaurants where id = '20000000-0000-0000-0000-000000000083' returning 1 $$,
                  'l''autor que encara és membre pot esborrar el seu restaurant del grup');
select isnt_empty($$ delete from public.wishlist where id = '30000000-0000-0000-0000-000000000082' returning 1 $$,
                  'l''autor que encara és membre pot esborrar el seu desitjat del grup');
-- Visita privada d'un autor que ja no és al grup: com si hagués esborrat el compte
select lives_ok($$ select public.save_visit('20000000-0000-0000-0000-000000000081', current_date, 5.0, 'Editada per sara',
                                            '{}', false, '50000000-0000-0000-0000-000000000080') $$,
                'sara pot editar la visita privada de quim després que surti del grup');
select throws_ok($$ select public.save_visit('20000000-0000-0000-0000-000000000081', current_date, 5.0, '', '{}', true,
                                             '50000000-0000-0000-0000-000000000080') $$,
                 'P0001', 'Només l''autor pot canviar si la visita és privada',
                 'sara no pot fer grupal la visita privada de quim');
select lives_ok($$ select public.delete_visit('50000000-0000-0000-0000-000000000080') $$,
                'sara pot esborrar la visita privada de quim després que surti del grup');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c8","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c8', true);
set local role authenticated;
select isnt_empty($$ delete from public.restaurants where id = '20000000-0000-0000-0000-000000000080' returning 1 $$,
                  'l''owner pot esborrar el restaurant d''un ex-membre');
select isnt_empty($$ delete from public.wishlist where id = '30000000-0000-0000-0000-000000000081' returning 1 $$,
                  'l''owner pot esborrar el desitjat d''un ex-membre');
reset role;

-- ------------------------------------------------------------ Coordenades (G7, propietat d'Ona)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c7', 'ona@test.dev', '{"full_name":"Ona"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000007', 'G7', 'OOOOOO', '00000000-0000-0000-0000-0000000000c7', 'Ona');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000c7');
insert into public.restaurants (id, group_id, name, address, lat, lng, created_by) values
  ('20000000-0000-0000-0000-000000000070', null, 'Ona personal', 'Carrer de Verdi, 21, Barcelona', 41.40, 2.15,
   '00000000-0000-0000-0000-0000000000c7'),
  ('20000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000007', 'Ona grup', 'Carrer Gran, 1, Girona',
   41.98, 2.82, '00000000-0000-0000-0000-0000000000c7'),
  ('20000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000007', 'Ona sense ubicar', 'Carrer Major, 1, Lleida',
   null, null, '00000000-0000-0000-0000-0000000000c7');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c7","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c7', true);
set local role authenticated;

select throws_ok($$ update public.restaurants set lat = 91, lng = 2 where id = '20000000-0000-0000-0000-000000000070' $$,
                 '23514', null, 'la latitud ha d''estar entre -90 i 90');
select throws_ok($$ update public.restaurants set lng = 181 where id = '20000000-0000-0000-0000-000000000070' $$,
                 '23514', null, 'la longitud ha d''estar entre -180 i 180');
select throws_ok($$ update public.restaurants set lat = null where id = '20000000-0000-0000-0000-000000000070' $$,
                 '23514', null, 'no es pot desar una coordenada sense l''altra');

select is((select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-000000000070',
                                        array['10000000-0000-0000-0000-000000000007'::uuid])), 1,
          'ona copia el restaurant personal al grup');
select is((select array[lat, lng] from public.restaurants
            where group_id = '10000000-0000-0000-0000-000000000007' and name = 'Ona personal'),
          array[41.40, 2.15]::double precision[], 'copy_to_groups conserva les coordenades');

select lives_ok($$ update public.restaurants set lat = 41.61, lng = 0.62 where id = '20000000-0000-0000-0000-000000000072' $$,
                'ona ubica un restaurant del grup des del mapa');
select is((select count(*)::int from public.group_changes where item_id = '20000000-0000-0000-0000-000000000072'), 0,
          'ubicar un restaurant (només coordenades) no deixa cap entrada a l''historial');

select lives_ok($$
  update public.restaurants set address = 'Plaça del Vi, 1, Girona', lat = 41.99, lng = 2.83
   where id = '20000000-0000-0000-0000-000000000071'
$$, 'ona canvia l''adreça d''un restaurant del grup');
select is((select old_data from public.group_changes where item_id = '20000000-0000-0000-0000-000000000071'),
          '{"address": "Carrer Gran, 1, Girona", "lat": 41.98, "lng": 2.82}'::jsonb,
          'canviar l''adreça desa també les coordenades anteriors');
select lives_ok(format('select public.restore_group_change(%L)',
                       (select id from public.group_changes where item_id = '20000000-0000-0000-0000-000000000071')),
                'ona desfà el canvi d''adreça');
select is((select array[address, lat::text, lng::text] from public.restaurants
            where id = '20000000-0000-0000-0000-000000000071'),
          array['Carrer Gran, 1, Girona', '41.98', '2.82'], 'desfer el canvi d''adreça torna el punt al lloc');
reset role;

-- ------------------------------------------------------------ Reaccions (G9, propietat d'Uma)
-- Uma és l'owner de G9, Vic n'és membre i Xavi no hi és.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'uma@test.dev', '{"full_name":"Uma"}'),
  ('00000000-0000-0000-0000-0000000000ab', 'vic@test.dev', '{"full_name":"Vic"}'),
  ('00000000-0000-0000-0000-0000000000ac', 'xavi@test.dev', '{"full_name":"Xavi"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-000000000009', 'G9', 'UUUUUU', '00000000-0000-0000-0000-0000000000aa', 'Uma');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000aa'),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000ab');
insert into public.restaurants (id, group_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000090', '10000000-0000-0000-0000-000000000009', 'G9 resto', '00000000-0000-0000-0000-0000000000aa'),
  ('20000000-0000-0000-0000-000000000091', null, 'Uma personal', '00000000-0000-0000-0000-0000000000aa');
insert into public.restaurant_visits (id, restaurant_id, group_id, created_by) values
  ('40000000-0000-0000-0000-000000000090', '20000000-0000-0000-0000-000000000090', '10000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-0000000000aa');
insert into public.wishlist (id, group_id, restaurant_name, user_id) values
  ('30000000-0000-0000-0000-000000000090', '10000000-0000-0000-0000-000000000009', 'Desitjat G9', '00000000-0000-0000-0000-0000000000ab');

-- Alertes amb l'ítem al qual es refereixen (0004), per reaccionar-hi des del feed
select is((select wishlist_id from public.alerts where group_id = '10000000-0000-0000-0000-000000000009' and type = 'wishlist_added'),
          '30000000-0000-0000-0000-000000000090'::uuid, 'l''alerta d''un desitjat nou guarda el desitjat');
select is((select row(restaurant_id, visit_id)::text from public.alerts
            where group_id = '10000000-0000-0000-0000-000000000009' and type = 'restaurant_reviewed'),
          row('20000000-0000-0000-0000-000000000090'::uuid, '40000000-0000-0000-0000-000000000090'::uuid)::text,
          'l''alerta d''una visita nova guarda el restaurant i la visita');

-- ---- Com a Vic (membre de G9)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ab","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ab', true);
set local role authenticated;
select lives_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000090', '👍');
  insert into public.reactions (wishlist_id, emoji) values ('30000000-0000-0000-0000-000000000090', '❤️');
  insert into public.reactions (visit_id, emoji) values ('40000000-0000-0000-0000-000000000090', '🙋')
$$, 'vic reacciona a un restaurant, un desitjat i una visita del seu grup');
select is((select array_agg(distinct row(group_id, user_id)::text) from public.reactions),
          array[row('10000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-0000000000ab'::uuid)::text],
          'el servidor posa el grup de l''ítem i l''usuari de la sessió');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000090', '👍')
$$, '23505', null, 'no es pot repetir la mateixa reacció al mateix ítem');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000091', '👍')
$$, 'P0001', 'Només es pot reaccionar als ítems d''un grup on ets membre', 'no es pot reaccionar a un ítem personal');
select throws_ok($$
  insert into public.reactions (emoji) values ('👍')
$$, 'P0001', 'Només es pot reaccionar als ítems d''un grup on ets membre', 'una reacció necessita un ítem');
select throws_ok($$
  insert into public.reactions (restaurant_id, wishlist_id, emoji)
  values ('20000000-0000-0000-0000-000000000090', '30000000-0000-0000-0000-000000000090', '🤤')
$$, '23514', null, 'una reacció no pot apuntar a dos ítems');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000090', '🍕')
$$, '23514', null, 'només es poden fer servir els emojis de la llista');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji, user_id)
  values ('20000000-0000-0000-0000-000000000090', '🤤', '00000000-0000-0000-0000-0000000000aa')
$$, '42501', null, 'vic no pot reaccionar en nom d''uma');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji, group_id)
  values ('20000000-0000-0000-0000-000000000090', '🤤', '10000000-0000-0000-0000-000000000001')
$$, '42501', null, 'vic no pot triar el grup de la reacció');
select throws_ok($$
  update public.reactions set emoji = '👎' where restaurant_id = '20000000-0000-0000-0000-000000000090'
$$, '42501', null, 'les reaccions no es poden editar');
reset role;
select ok(exists (select 1 from realtime.messages
                   where topic = 'group:10000000-0000-0000-0000-000000000009' and payload ->> 'table' = 'reactions'),
          'reaccionar avisa el canal del grup');

-- ---- Com a Xavi (aliè a G9)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ac","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ac', true);
set local role authenticated;
select is((select count(*)::int from public.reactions), 0, 'xavi no veu les reaccions d''un grup on no és');
select throws_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000090', '👍')
$$, 'P0001', 'Només es pot reaccionar als ítems d''un grup on ets membre', 'xavi no pot reaccionar en un grup on no és');
reset role;

-- ---- Com a Uma (propietària de G9)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select is((select count(*)::int from public.reactions), 3, 'uma veu les reaccions de vic al grup');
delete from public.reactions;
select is((select count(*)::int from public.reactions), 3, 'uma no pot esborrar les reaccions de vic (ni sent l''owner)');
select lives_ok($$
  insert into public.reactions (restaurant_id, emoji) values ('20000000-0000-0000-0000-000000000090', '🤤');
  delete from public.reactions where user_id = auth.uid()
$$, 'uma treu la seva pròpia reacció');
select lives_ok($$
  insert into public.reactions (wishlist_id, emoji) values ('30000000-0000-0000-0000-000000000090', '❤️');
  select public.convert_wishlist_to_restaurant('30000000-0000-0000-0000-000000000090', current_date, null, '', '{}')
$$, 'uma converteix en restaurant un desitjat amb reaccions');
select is((select array_agg(r.user_id order by r.user_id) from public.reactions r join public.restaurants x on x.id = r.restaurant_id
            where x.name = 'Desitjat G9' and r.emoji = '❤️'),
          array['00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000ab']::uuid[],
          'les reaccions del desitjat passen al restaurant nou');
select lives_ok($$
  delete from public.restaurants where id = '20000000-0000-0000-0000-000000000090'
$$, 'uma esborra un restaurant amb reaccions i una visita amb reaccions');
reset role;
select is((select count(*)::int from public.reactions
            where restaurant_id = '20000000-0000-0000-0000-000000000090' or visit_id = '40000000-0000-0000-0000-000000000090'), 0,
          'esborrar un restaurant n''esborra les reaccions i les de les seves visites');

-- ---- Vic surt de G9
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ab","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ab', true);
set local role authenticated;
select lives_ok($$
  delete from public.group_members where group_id = '10000000-0000-0000-0000-000000000009' and user_id = auth.uid()
$$, 'vic surt de G9');
reset role;
select is((select count(*)::int from public.reactions where user_id = '00000000-0000-0000-0000-0000000000ab'), 0,
          'sortir d''un grup n''esborra les reaccions pròpies');
select ok(exists (select 1 from public.reactions where user_id = '00000000-0000-0000-0000-0000000000aa'),
          'les reaccions de la resta de membres es mantenen');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000aa';
select is((select count(*)::int from public.reactions where user_id = '00000000-0000-0000-0000-0000000000aa'), 0,
          'esborrar un compte n''esborra les reaccions');

-- ------------------------------------------------------------ Quotes contra l'abús (Eve)
select is(array[public.quota_limit('personal_items'), public.quota_limit('group_items'),
                public.quota_limit('owned_groups'), public.quota_limit('restaurant_visits'),
                public.quota_limit('group_alerts_per_hour'), public.quota_limit('nickname_interval_seconds'),
                public.quota_limit('group_changes')],
          array[2000, 5000, 20, 500, 50, 60, 1000],
          'quotes de producció: 2.000 per espai personal, 5.000 per grup, 20 grups, 500 visites, 50 alertes/hora, 1 canvi de nickname/minut i 1.000 entrades d''historial per grup');

-- Límits petits per no haver d'inserir milers de files (el rollback final ho desfà).
create or replace function public.quota_limit(p_name text)
returns int language plpgsql stable set search_path = '' as $$
begin
  return case p_name
    when 'personal_items' then 2
    when 'group_items' then 3
    when 'owned_groups' then 2
    when 'restaurant_visits' then 2
    when 'group_alerts_per_hour' then 3
    when 'group_changes' then 2
  end;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eve@test.dev', '{"full_name":"Eve"}');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);

-- Espai personal (les files amb id fix, com a postgres: des del client, l'id el genera el servidor)
insert into public.restaurants (id, name, created_by) values
  ('20000000-0000-0000-0000-0000000000e1', 'Eve personal 1', '00000000-0000-0000-0000-0000000000e1'),
  ('20000000-0000-0000-0000-0000000000e2', 'Eve personal 2', '00000000-0000-0000-0000-0000000000e1');
insert into public.wishlist (id, restaurant_name, user_id) values
  ('30000000-0000-0000-0000-0000000000e1', 'Eve desitjat 1', '00000000-0000-0000-0000-0000000000e1'),
  ('30000000-0000-0000-0000-0000000000e2', 'Eve desitjat 2', '00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select throws_ok($$
  insert into public.restaurants (name, created_by) values ('Eve personal 3', '00000000-0000-0000-0000-0000000000e1')
$$, 'OMQ01', null, 'no es poden afegir més restaurants personals que la quota');
select throws_ok($$
  insert into public.wishlist (restaurant_name, user_id) values ('Eve desitjat 3', '00000000-0000-0000-0000-0000000000e1')
$$, 'OMQ01', null, 'no es poden afegir més desitjats personals que la quota');
select lives_ok($$
  delete from public.restaurants where id = '20000000-0000-0000-0000-0000000000e2';
  insert into public.restaurants (name, created_by) values ('Eve personal 2 bis', '00000000-0000-0000-0000-0000000000e1')
$$, 'esborrar un restaurant personal allibera quota');

-- Grups
select lives_ok($$ select public.create_group('Quota 1'); select public.create_group('Quota 2') $$,
                'eve crea tants grups com permet la quota');
select throws_ok($$ select public.create_group('Quota 3') $$, 'OMQ01', null,
                 'no es poden crear més grups propis que la quota');

-- Cedir un grup a algú que ja té el màxim de grups propis
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e2', 'fede@test.dev', '{"full_name":"Fede"}');
insert into public.groups (id, name, code, owner_id, owner_name) values
  ('10000000-0000-0000-0000-0000000000e2', 'De Fede', 'FFFFFF', '00000000-0000-0000-0000-0000000000e2', 'Fede');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e2'),
  ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
set local role authenticated;
select throws_ok($$ select public.transfer_group_ownership('10000000-0000-0000-0000-0000000000e2',
                                                          '00000000-0000-0000-0000-0000000000e1') $$,
                 'OMQ01', null, 'no es pot cedir un grup a algú que ja té el màxim de grups propis');
reset role;
select is((select owner_id from public.groups where id = '10000000-0000-0000-0000-0000000000e2'),
          '00000000-0000-0000-0000-0000000000e2'::uuid, 'el grup continua sent de qui l''intentava cedir');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
set local role authenticated;

-- Contingut de grup: la quota també s'aplica en moure i copiar ítems al grup
select lives_ok($$
  insert into public.restaurants (group_id, name, created_by)
  select g.id, 'Eve grup ' || i, '00000000-0000-0000-0000-0000000000e1'
    from public.groups g, generate_series(1, 3) i
   where g.name = 'Quota 1'
$$, 'eve omple el grup fins a la quota');
select throws_ok($$
  insert into public.restaurants (group_id, name, created_by)
  select id, 'Eve grup 4', '00000000-0000-0000-0000-0000000000e1' from public.groups where name = 'Quota 1'
$$, 'OMQ01', null, 'no es poden afegir més restaurants a un grup que la quota');
select throws_ok($$
  select public.move_to_group('restaurant', '20000000-0000-0000-0000-0000000000e1',
                              (select id from public.groups where name = 'Quota 1'))
$$, 'OMQ01', null, 'move_to_group respecta la quota del grup destí');
select throws_ok($$
  select public.copy_to_groups('restaurant', '20000000-0000-0000-0000-0000000000e1',
                               array[(select id from public.groups where name = 'Quota 1')])
$$, 'OMQ01', null, 'copy_to_groups respecta la quota del grup destí');
select lives_ok($$
  select public.move_to_group('wishlist', '30000000-0000-0000-0000-0000000000e1',
                              (select id from public.groups where name = 'Quota 1'))
$$, 'la quota de desitjats del grup és independent de la de restaurants');

-- Alertes: 1 de crear el grup + 3 restaurants + 1 desitjat = 5 intents, però només se'n guarden 3
select is((select count(*)::int from public.alerts a join public.groups g on g.id = a.group_id
            where g.name = 'Quota 1' and a.user_id = '00000000-0000-0000-0000-0000000000e1'), 3,
          'les alertes que un usuari genera en un grup es limiten per hora');
select is((select count(*)::int from public.wishlist w join public.groups g on g.id = w.group_id
            where g.name = 'Quota 1'), 1,
          'el límit d''alertes no impedeix l''acció que les genera');

-- Visites
select lives_ok($$
  select public.save_visit('20000000-0000-0000-0000-0000000000e1', current_date, 4.0, '', '{}', true, null);
  select public.save_visit('20000000-0000-0000-0000-0000000000e1', current_date, 3.0, '', '{}', true, null)
$$, 'eve registra tantes visites com permet la quota');
select throws_ok($$
  select public.save_visit('20000000-0000-0000-0000-0000000000e1', current_date, 5.0, '', '{}', true, null)
$$, 'OMQ01', null, 'no es poden registrar més visites d''un restaurant que la quota');
select lives_ok($$
  select public.save_visit('20000000-0000-0000-0000-0000000000e1', current_date, 5.0, 'editada', '{}', true,
                           (select id from public.restaurant_visits
                             where restaurant_id = '20000000-0000-0000-0000-0000000000e1' limit 1))
$$, 'amb la quota plena es pot continuar editant una visita');

-- Historial: passat el límit, es descarten les entrades més antigues
select lives_ok($$
  update public.restaurants set notes = 'u1' where name = 'Eve grup 1';
  update public.restaurants set notes = 'u2' where name = 'Eve grup 1';
  update public.restaurants set notes = 'u3' where name = 'Eve grup 1'
$$, 'eve edita tres vegades un restaurant del grup');
select is((select array_agg(new_data ->> 'notes' order by new_data ->> 'notes')
             from public.group_changes c join public.groups g on g.id = c.group_id where g.name = 'Quota 1'),
          array['u2', 'u3'], 'l''historial d''un grup només guarda les entrades més recents fins a la quota');
reset role;

select * from finish();
rollback;
