-- Dades de prova per a l'entorn local (Supabase en Docker). NO és una migració: només el carrega
-- `supabase db reset` (make db-reset) i el primer `supabase start`; `db push` no l'envia mai a producció.
--
-- Usuaris (contrasenya comuna: onmenjem), accessibles des del selector de la pantalla de benvinguda
-- quan l'app corre en mode localdb (make dev):
--   marta@onmenjem.local  Marta  owner de «Sopars de divendres», membre de «Família»
--   pau@onmenjem.local    Pau    owner de «Família», membre de «Sopars de divendres»
--   laia@onmenjem.local   Laia   membre de «Sopars de divendres»
--   jordi@onmenjem.local  Jordi  membre de «Sopars de divendres»
--   nuria@onmenjem.local  Núria  membre de «Família»
-- Codis d'invitació: TAPES2 (Sopars de divendres) i CASA23 (Família). Amb el teu compte de Google
-- pots entrar-hi des de l'app («Uneix-te a un grup»).
--
-- Els noms dels restaurants són inventats. Els UUID fixos (prefix 5eed) no xoquen amb els de rls.test.sql.

begin;

-- ---------------------------------------------------------------- Usuaris

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change,
  phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       crypt('onmenjem', gen_salt('bf')), now() - u.age,
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name),
       now() - u.age, now() - u.age, '', '', '', '', '', '', ''
  from (values
    ('5eed0000-0000-0000-0000-000000000001'::uuid, 'marta@onmenjem.local', 'Marta', interval '120 days'),
    ('5eed0000-0000-0000-0000-000000000002'::uuid, 'pau@onmenjem.local',   'Pau',   interval '110 days'),
    ('5eed0000-0000-0000-0000-000000000003'::uuid, 'laia@onmenjem.local',  'Laia',  interval '80 days'),
    ('5eed0000-0000-0000-0000-000000000004'::uuid, 'jordi@onmenjem.local', 'Jordi', interval '60 days'),
    ('5eed0000-0000-0000-0000-000000000005'::uuid, 'nuria@onmenjem.local', 'Núria', interval '45 days')
  ) as u (id, email, name, age);

-- Sense identitat d'email, GoTrue no accepta signInWithPassword.
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), u.created_at, u.created_at
  from auth.users u
 where u.email like '%@onmenjem.local';

-- El trigger handle_new_user ja ha creat els perfils; només hi fixem l'avatar i l'antiguitat.
update public.profiles p
   set avatar = v.avatar, created_at = now() - v.age, last_login_at = now() - v.last_login
  from (values
    ('5eed0000-0000-0000-0000-000000000001'::uuid, '🍣', interval '120 days', interval '2 hours'),
    ('5eed0000-0000-0000-0000-000000000002'::uuid, '🍷', interval '110 days', interval '1 day'),
    ('5eed0000-0000-0000-0000-000000000003'::uuid, '🥗', interval '80 days',  interval '3 days'),
    ('5eed0000-0000-0000-0000-000000000004'::uuid, '🍔', interval '60 days',  interval '6 days'),
    ('5eed0000-0000-0000-0000-000000000005'::uuid, '🥞', interval '45 days',  interval '12 days')
  ) as v (id, avatar, age, last_login)
 where p.id = v.id;

-- ---------------------------------------------------------------- Grups

insert into public.groups (id, name, description, code, owner_id, owner_name, created_at, updated_at) values
  ('5eed0001-0000-0000-0000-000000000001', 'Sopars de divendres',
   'Els llocs que provem (o volem provar) la colla els divendres al vespre.', 'TAPES2',
   '5eed0000-0000-0000-0000-000000000001', 'Marta', now() - interval '100 days', now() - interval '100 days'),
  ('5eed0001-0000-0000-0000-000000000002', 'Família',
   'Dinars de diumenge i celebracions.', 'CASA23',
   '5eed0000-0000-0000-0000-000000000002', 'Pau', now() - interval '70 days', now() - interval '70 days');

insert into public.group_members (group_id, user_id, joined_at) values
  ('5eed0001-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000001', now() - interval '100 days'),
  ('5eed0001-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000002', now() - interval '98 days'),
  ('5eed0001-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000003', now() - interval '75 days'),
  ('5eed0001-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000004', now() - interval '20 days'),
  ('5eed0001-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000002', now() - interval '70 days'),
  ('5eed0001-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000005', now() - interval '40 days'),
  ('5eed0001-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000001', now() - interval '5 days');

-- Marta i Pau entren directament al grup; la resta, al seu espai personal.
update public.profiles set active_group_id = '5eed0001-0000-0000-0000-000000000001'
 where id = '5eed0000-0000-0000-0000-000000000001';
update public.profiles set active_group_id = '5eed0001-0000-0000-0000-000000000002'
 where id = '5eed0000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------- Restaurants

-- group_id NULL = espai personal de created_by. created_by_name l'omple el trigger set_author_name.
insert into public.restaurants (id, group_id, name, cuisine, price_range, address, rating, notes, link, instagram,
                                favorite, created_by, created_at, updated_at)
select r.id, r.group_id, r.name, r.cuisine, r.price_range, r.address, r.rating, r.notes, r.link, r.instagram,
       r.favorite, r.created_by, now() - r.age, now() - r.age
  from (values
    -- Sopars de divendres
    ('5eed0002-0000-0000-0000-000000000001'::uuid, '5eed0001-0000-0000-0000-000000000001'::uuid, 'La Barca del Moll', 'Marisc', '€€€',
     'Passeig de Joan de Borbó, 48, Barcelona', null::numeric, 'Demanar l''arròs negre i la gamba a la planxa. Cal reservar.',
     'https://example.com/labarcadelmoll', 'labarcadelmoll', true, '5eed0000-0000-0000-0000-000000000001'::uuid, interval '95 days'),
    ('5eed0002-0000-0000-0000-000000000002', '5eed0001-0000-0000-0000-000000000001', 'Tasca Gràcia', 'Bar', '€',
     'Carrer de Verdi, 21, Barcelona', null, 'Braves de les bones i vermut de la casa.',
     null, 'tascagracia', true, '5eed0000-0000-0000-0000-000000000002', interval '90 days'),
    ('5eed0002-0000-0000-0000-000000000003', '5eed0001-0000-0000-0000-000000000001', 'Osteria Nonna Pina', 'Italiana', '€€',
     'Carrer de Parlament, 7, Barcelona', null, 'Pasta fresca feta al moment. El tiramisú, imprescindible.',
     'https://example.com/nonnapina', null, false, '5eed0000-0000-0000-0000-000000000003', interval '72 days'),
    ('5eed0002-0000-0000-0000-000000000004', '5eed0001-0000-0000-0000-000000000001', 'Kaiten Sant Antoni', 'Japonesa', '€€',
     'Carrer del Comte Borrell, 33, Barcelona', null, 'Cinta de sushi. Millor anar-hi d''hora.',
     null, 'kaitensantantoni', false, '5eed0000-0000-0000-0000-000000000001', interval '60 days'),
    ('5eed0002-0000-0000-0000-000000000005', '5eed0001-0000-0000-0000-000000000001', 'Brasa i Fum', 'Graella', '€€€',
     'Carrer de Pujades, 102, Barcelona', null, 'Carn madurada i verdures a la brasa. Terrassa a l''estiu.',
     'https://example.com/brasaifum', 'brasaifum', true, '5eed0000-0000-0000-0000-000000000002', interval '55 days'),
    ('5eed0002-0000-0000-0000-000000000006', '5eed0001-0000-0000-0000-000000000001', 'Masala Raval', 'Índia', '€',
     'Carrer de l''Hospital, 64, Barcelona', null, 'Thali vegetarià molt complet. Picant de veritat si ho demanes.',
     null, null, false, '5eed0000-0000-0000-0000-000000000003', interval '40 days'),
    ('5eed0002-0000-0000-0000-000000000007', '5eed0001-0000-0000-0000-000000000001', 'Txoko Eixample', 'Basca', '€€',
     'Carrer d''Aribau, 115, Barcelona', null, 'Pintxos a la barra; el de truita de bacallà guanya.',
     null, 'txokoeixample', false, '5eed0000-0000-0000-0000-000000000004', interval '18 days'),
    ('5eed0002-0000-0000-0000-000000000008', '5eed0001-0000-0000-0000-000000000001', 'Smash Bros Burger', 'Menjar ràpid', '€',
     'Carrer de Sants, 88, Barcelona', 3.0, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000004', interval '10 days'),
    ('5eed0002-0000-0000-0000-000000000009', '5eed0001-0000-0000-0000-000000000001', 'Bodega La Garnatxa', 'Vinoteca', '€€',
     'Carrer de Blai, 14, Barcelona', null, 'Més de 200 referències de vi. Formatges catalans.',
     'https://example.com/lagarnatxa', null, false, '5eed0000-0000-0000-0000-000000000001', interval '3 days'),
    ('5eed0002-0000-0000-0000-000000000010', '5eed0001-0000-0000-0000-000000000001', 'Pho Saigon Clot', 'Asiàtica', '€',
     'Carrer del Clot, 45, Barcelona', null, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000002', interval '1 day'),
    -- Família
    ('5eed0002-0000-0000-0000-000000000011', '5eed0001-0000-0000-0000-000000000002', 'Can Pere del Camí', 'Catalana', '€€',
     'Carretera de Vic, km 4, Manlleu', null, 'Cuina de masia: canelons, fricandó i crema cremada. Hi ha lloc per als nens.',
     null, null, true, '5eed0000-0000-0000-0000-000000000002', interval '68 days'),
    ('5eed0002-0000-0000-0000-000000000012', '5eed0001-0000-0000-0000-000000000002', 'Arrossaria Mar Blava', 'Mediterrània', '€€€',
     'Passeig del Mar, 3, Sant Feliu de Guíxols', null, 'Paella per a 6 encarregada amb antelació.',
     'https://example.com/marblava', 'arrossariamarblava', false, '5eed0000-0000-0000-0000-000000000005', interval '35 days'),
    ('5eed0002-0000-0000-0000-000000000013', '5eed0001-0000-0000-0000-000000000002', 'Fleca Cal Ros', 'Fleca', '€',
     'Plaça Major, 9, Girona', 4.5, 'Coca de llardons els diumenges.',
     null, null, false, '5eed0000-0000-0000-0000-000000000005', interval '20 days'),
    ('5eed0002-0000-0000-0000-000000000014', '5eed0001-0000-0000-0000-000000000002', 'El Racó de l''Àvia', 'Espanyola', '€€',
     'Carrer Nou, 22, Girona', null, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000001', interval '4 days'),
    -- Personal de Marta
    ('5eed0002-0000-0000-0000-000000000015', null, 'Café Lumière', 'Cafè', '€',
     'Carrer de Torrijos, 30, Barcelona', null, 'Bon cafè d''especialitat i wifi per treballar.',
     null, 'cafelumiere', true, '5eed0000-0000-0000-0000-000000000001', interval '115 days'),
    ('5eed0002-0000-0000-0000-000000000016', null, 'Green Bowl', 'Vegetariana', '€€',
     'Carrer de Pau Claris, 140, Barcelona', null, 'Per dinar ràpid a prop de la feina.',
     null, null, false, '5eed0000-0000-0000-0000-000000000001', interval '50 days'),
    ('5eed0002-0000-0000-0000-000000000017', null, 'Pastisseria Sucre', 'Postres', '€€',
     'Carrer Gran de Gràcia, 190, Barcelona', 5.0, 'Croissants de mantega i pastís de formatge.',
     null, 'pastisseriasucre', true, '5eed0000-0000-0000-0000-000000000001', interval '30 days'),
    ('5eed0002-0000-0000-0000-000000000018', null, 'Brunch & Co', 'Brunch', '€€',
     'Carrer de Enric Granados, 58, Barcelona', null, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000001', interval '7 days'),
    -- Personal de Pau
    ('5eed0002-0000-0000-0000-000000000019', null, 'Cerveseria La Llúpol', 'Cerveseria', '€',
     'Carrer de Sardenya, 250, Barcelona', null, 'Cervesa artesana de barril, rotació setmanal.',
     null, 'lallupol', true, '5eed0000-0000-0000-0000-000000000002', interval '100 days'),
    ('5eed0002-0000-0000-0000-000000000020', null, 'Taqueria El Güero', 'Americana', '€',
     'Carrer de Joaquín Costa, 11, Barcelona', 4.0, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000002', interval '25 days'),
    -- Personal de Laia
    ('5eed0002-0000-0000-0000-000000000021', null, 'Falafel Beirut', 'Orient Mitjà', '€',
     'Carrer de la Riera Baixa, 5, Barcelona', null, 'Hummus casolà. Obren fins tard.',
     null, null, false, '5eed0000-0000-0000-0000-000000000003', interval '65 days'),
    ('5eed0002-0000-0000-0000-000000000022', null, 'Esmorzars Cal Tonet', 'Esmorzar', '€',
     'Carrer de Sant Joan, 17, Terrassa', null, 'Esmorzars de forquilla els dissabtes.',
     null, null, false, '5eed0000-0000-0000-0000-000000000003', interval '15 days'),
    -- Personal de Jordi (sense visites: per veure l'estat buit del detall)
    ('5eed0002-0000-0000-0000-000000000023', null, 'Wok Express Sants', 'Asiàtica', '€',
     'Carrer de Sants, 140, Barcelona', null, null,
     null, null, false, '5eed0000-0000-0000-0000-000000000004', interval '12 days')
  ) as r (id, group_id, name, cuisine, price_range, address, rating, notes, link, instagram, favorite, created_by, age);

-- ---------------------------------------------------------------- Desitjats

insert into public.wishlist (id, group_id, restaurant_name, cuisine, price_range, address, recommended_by, notes,
                             link, instagram, status, user_id, created_at, updated_at)
select w.id, w.group_id, w.name, w.cuisine, w.price_range, w.address, w.recommended_by, w.notes,
       w.link, w.instagram, w.status, w.user_id, now() - w.age, now() - w.age
  from (values
    -- Sopars de divendres
    ('5eed0003-0000-0000-0000-000000000001'::uuid, '5eed0001-0000-0000-0000-000000000001'::uuid, 'Izakaya Hoshi', 'Japonesa', '€€€',
     'Carrer de Muntaner, 77, Barcelona', 'Una companya de feina de la Laia', 'Diuen que el ramen de dissabte és brutal.',
     null::text, 'izakayahoshi', 'planned', '5eed0000-0000-0000-0000-000000000003'::uuid, interval '30 days'),
    ('5eed0003-0000-0000-0000-000000000002', '5eed0001-0000-0000-0000-000000000001', 'La Vermuteria del Mercat', 'Bar', '€',
     'Mercat de Sant Antoni, Barcelona', 'Pau', null,
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000002', interval '22 days'),
    ('5eed0003-0000-0000-0000-000000000003', '5eed0001-0000-0000-0000-000000000001', 'Trattoria Da Gino', 'Italiana', '€€',
     'Carrer de Provença, 301, Barcelona', 'Instagram', 'Pizza napolitana al forn de llenya.',
     'https://example.com/dagino', 'trattoriadagino', 'pending', '5eed0000-0000-0000-0000-000000000004', interval '9 days'),
    ('5eed0003-0000-0000-0000-000000000004', '5eed0001-0000-0000-0000-000000000001', 'Sidreria Gure Etxea', 'Basca', '€€€',
     'Carrer del Rosselló, 210, Barcelona', 'El cunyat de la Marta', 'Menú de sidreria amb txuleta.',
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000001', interval '2 days'),
    ('5eed0003-0000-0000-0000-000000000005', '5eed0001-0000-0000-0000-000000000001', 'Dim Sum Palace', 'Asiàtica', '€€',
     'Carrer de Girona, 40, Barcelona', null, null,
     null, null, 'visited', '5eed0000-0000-0000-0000-000000000003', interval '50 days'),
    -- Família
    ('5eed0003-0000-0000-0000-000000000006', '5eed0001-0000-0000-0000-000000000002', 'Mas Les Oliveres', 'Catalana', '€€€',
     'Camí de Sant Martí, s/n, Peratallada', 'La tieta Rosa', 'Per a l''aniversari dels avis. Tenen menú de grup.',
     'https://example.com/lesoliveres', null, 'planned', '5eed0000-0000-0000-0000-000000000005', interval '14 days'),
    ('5eed0003-0000-0000-0000-000000000007', '5eed0001-0000-0000-0000-000000000002', 'Gelateria Polo Nord', 'Postres', '€',
     'Rambla de la Llibertat, 2, Girona', 'Núria', null,
     null, 'gelateriapolonord', 'pending', '5eed0000-0000-0000-0000-000000000005', interval '6 days'),
    -- Personal de Marta
    ('5eed0003-0000-0000-0000-000000000008', null, 'Forn de Pa Llevat', 'Fleca', '€',
     'Carrer del Torrent de l''Olla, 99, Barcelona', 'Podcast de gastronomia', 'Pa de massa mare.',
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000001', interval '40 days'),
    ('5eed0003-0000-0000-0000-000000000009', null, 'Ramen Ya Kenji', 'Japonesa', '€€',
     'Carrer de Casp, 66, Barcelona', 'Jordi', null,
     null, 'ramenyakenji', 'planned', '5eed0000-0000-0000-0000-000000000001', interval '11 days'),
    ('5eed0003-0000-0000-0000-000000000010', null, 'Xiringuito Cala Fosca', 'Marisc', '€€',
     'Cala Fosca, Palamós', null, 'Per a l''estiu vinent.',
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000001', interval '1 day'),
    -- Personal de Pau
    ('5eed0003-0000-0000-0000-000000000011', null, 'Bar Celoneta Sport', 'Bar', '€',
     'Carrer de la Maquinista, 8, Barcelona', 'Un amic del futbol', null,
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000002', interval '33 days'),
    ('5eed0003-0000-0000-0000-000000000012', null, 'Smokehouse Poblenou', 'Graella', '€€',
     'Rambla del Poblenou, 120, Barcelona', null, 'Costelles a la barbacoa estil Texas.',
     'https://example.com/smokehouse', null, 'visited', '5eed0000-0000-0000-0000-000000000002', interval '58 days'),
    -- Personal de Laia
    ('5eed0003-0000-0000-0000-000000000013', null, 'Vegà de Barri', 'Vegetariana', '€',
     'Carrer de Torrent de les Flors, 12, Barcelona', 'Instagram', null,
     null, 'vegadebarri', 'pending', '5eed0000-0000-0000-0000-000000000003', interval '5 days'),
    -- Personal de Núria
    ('5eed0003-0000-0000-0000-000000000014', null, 'Cafeteria Les Voltes', 'Cafè', '€',
     'Carrer de les Voltes, 4, Girona', null, null,
     null, null, 'pending', '5eed0000-0000-0000-0000-000000000005', interval '8 days')
  ) as w (id, group_id, name, cuisine, price_range, address, recommended_by, notes, link, instagram, status, user_id, age);

-- ---------------------------------------------------------------- Visites

-- created_by_name no té trigger: s'agafa del perfil. shared = false és una visita privada (només al grup).
insert into public.restaurant_visits (id, restaurant_id, group_id, visited_on, rating, notes, shared,
                                      created_by, created_by_name, created_at, updated_at)
select v.id, v.restaurant_id, r.group_id, current_date - v.days_ago, v.rating, v.notes, v.shared,
       v.created_by, p.nickname, now() - make_interval(days => v.days_ago), now() - make_interval(days => v.days_ago)
  from (values
    -- La Barca del Moll: tres visites, una privada
    ('5eed0004-0000-0000-0000-000000000001'::uuid, '5eed0002-0000-0000-0000-000000000001'::uuid, 88, 4.5::numeric,
     'Arròs negre espectacular. Servei una mica lent.', true, '5eed0000-0000-0000-0000-000000000001'::uuid),
    ('5eed0004-0000-0000-0000-000000000002', '5eed0002-0000-0000-0000-000000000001', 45, 5.0,
     'Sopar d''aniversari de la Laia. Ens van convidar als xupitos.', true, '5eed0000-0000-0000-0000-000000000003'),
    ('5eed0004-0000-0000-0000-000000000003', '5eed0002-0000-0000-0000-000000000001', 12, 3.5,
     'Aquest cop el peix no era tan fresc.', false, '5eed0000-0000-0000-0000-000000000002'),
    -- Tasca Gràcia
    ('5eed0004-0000-0000-0000-000000000004', '5eed0002-0000-0000-0000-000000000002', 85, 4.0,
     null, true, '5eed0000-0000-0000-0000-000000000002'),
    ('5eed0004-0000-0000-0000-000000000005', '5eed0002-0000-0000-0000-000000000002', 30, 4.5,
     'Les braves continuen sent les millors del barri.', true, '5eed0000-0000-0000-0000-000000000001'),
    ('5eed0004-0000-0000-0000-000000000006', '5eed0002-0000-0000-0000-000000000002', 2, 4.0,
     'Vermut ràpid abans del cine.', true, '5eed0000-0000-0000-0000-000000000004'),
    -- Osteria Nonna Pina
    ('5eed0004-0000-0000-0000-000000000007', '5eed0002-0000-0000-0000-000000000003', 70, 4.0,
     'Carbonara autèntica, sense nata.', true, '5eed0000-0000-0000-0000-000000000003'),
    ('5eed0004-0000-0000-0000-000000000008', '5eed0002-0000-0000-0000-000000000003', 21, 2.5,
     'Massa soroll i ens van fer esperar 40 minuts.', false, '5eed0000-0000-0000-0000-000000000001'),
    -- Kaiten Sant Antoni
    ('5eed0004-0000-0000-0000-000000000009', '5eed0002-0000-0000-0000-000000000004', 58, 3.5,
     null, true, '5eed0000-0000-0000-0000-000000000001'),
    -- Brasa i Fum
    ('5eed0004-0000-0000-0000-000000000010', '5eed0002-0000-0000-0000-000000000005', 52, 5.0,
     'La millor txuleta que hem menjat. Tornarem segur.', true, '5eed0000-0000-0000-0000-000000000002'),
    ('5eed0004-0000-0000-0000-000000000011', '5eed0002-0000-0000-0000-000000000005', 16, 4.5,
     'Les verdures a la brasa, un deu.', true, '5eed0000-0000-0000-0000-000000000004'),
    -- Masala Raval
    ('5eed0004-0000-0000-0000-000000000012', '5eed0002-0000-0000-0000-000000000006', 38, 4.0,
     'Barat i abundant.', true, '5eed0000-0000-0000-0000-000000000003'),
    -- Txoko Eixample: visita d'aquesta setmana
    ('5eed0004-0000-0000-0000-000000000013', '5eed0002-0000-0000-0000-000000000007', 4, 4.5,
     'Pintxos boníssims. La barra s''omple a partir de les nou.', true, '5eed0000-0000-0000-0000-000000000004'),
    -- Can Pere del Camí (Família)
    ('5eed0004-0000-0000-0000-000000000014', '5eed0002-0000-0000-0000-000000000011', 63, 4.5,
     'Dinar de Sant Esteve. Canelons com els de l''àvia.', true, '5eed0000-0000-0000-0000-000000000002'),
    ('5eed0004-0000-0000-0000-000000000015', '5eed0002-0000-0000-0000-000000000011', 27, 4.0,
     null, true, '5eed0000-0000-0000-0000-000000000005'),
    ('5eed0004-0000-0000-0000-000000000016', '5eed0002-0000-0000-0000-000000000011', 3, 5.0,
     'Primer dinar de la Marta amb la família. Tothom content.', true, '5eed0000-0000-0000-0000-000000000001'),
    -- Arrossaria Mar Blava (Família)
    ('5eed0004-0000-0000-0000-000000000017', '5eed0002-0000-0000-0000-000000000012', 33, 3.5,
     'Bona paella però car per al que és.', true, '5eed0000-0000-0000-0000-000000000005'),
    -- Personals de Marta
    ('5eed0004-0000-0000-0000-000000000018', '5eed0002-0000-0000-0000-000000000015', 110, 4.0,
     null, true, '5eed0000-0000-0000-0000-000000000001'),
    ('5eed0004-0000-0000-0000-000000000019', '5eed0002-0000-0000-0000-000000000015', 60, 4.5,
     'Han canviat de torrador i el cafè ha millorat.', true, '5eed0000-0000-0000-0000-000000000001'),
    ('5eed0004-0000-0000-0000-000000000020', '5eed0002-0000-0000-0000-000000000015', 9, 4.5,
     null, true, '5eed0000-0000-0000-0000-000000000001'),
    ('5eed0004-0000-0000-0000-000000000021', '5eed0002-0000-0000-0000-000000000016', 48, 3.0,
     'Correcte, res de l''altre món.', true, '5eed0000-0000-0000-0000-000000000001'),
    ('5eed0004-0000-0000-0000-000000000022', '5eed0002-0000-0000-0000-000000000018', 6, null,
     'Hi vaig anar però no recordo prou per valorar-lo.', true, '5eed0000-0000-0000-0000-000000000001'),
    -- Personals de Pau
    ('5eed0004-0000-0000-0000-000000000023', '5eed0002-0000-0000-0000-000000000019', 95, 4.5,
     'IPA de la casa molt bona.', true, '5eed0000-0000-0000-0000-000000000002'),
    ('5eed0004-0000-0000-0000-000000000024', '5eed0002-0000-0000-0000-000000000019', 40, 4.0,
     null, true, '5eed0000-0000-0000-0000-000000000002'),
    -- Personals de Laia
    ('5eed0004-0000-0000-0000-000000000025', '5eed0002-0000-0000-0000-000000000021', 62, 4.0,
     null, true, '5eed0000-0000-0000-0000-000000000003'),
    ('5eed0004-0000-0000-0000-000000000026', '5eed0002-0000-0000-0000-000000000022', 13, 5.0,
     'Cap-i-pota per esmorzar. Llegendari.', true, '5eed0000-0000-0000-0000-000000000003')
  ) as v (id, restaurant_id, days_ago, rating, notes, shared, created_by)
  join public.restaurants r on r.id = v.restaurant_id
  join public.profiles p on p.id = v.created_by;

-- Assistents: membres del grup (o el mateix autor a l'espai personal).
insert into public.visit_attendees (visit_id, user_id)
select ('5eed0004-0000-0000-0000-0000000000' || lpad(a.visit::text, 2, '0'))::uuid,
       ('5eed0000-0000-0000-0000-00000000000' || a.member)::uuid
  from (values
    (1, 1), (1, 2),
    (2, 1), (2, 2), (2, 3),
    (3, 2),
    (4, 1), (4, 2),
    (5, 1), (5, 3), (5, 4),
    (6, 4), (6, 2),
    (7, 3), (7, 1),
    (8, 1),
    (9, 1), (9, 2), (9, 3),
    (10, 1), (10, 2), (10, 3), (10, 4),
    (11, 4), (11, 2),
    (12, 3),
    (13, 4), (13, 1), (13, 2), (13, 3),
    (14, 2), (14, 5),
    (15, 5), (15, 2),
    (16, 1), (16, 2), (16, 5),
    (17, 5), (17, 2),
    (18, 1), (19, 1), (20, 1), (21, 1), (22, 1),
    (23, 2), (24, 2),
    (25, 3), (26, 3)
  ) as a (visit, member);

-- ---------------------------------------------------------------- Alertes

-- Els triggers han creat alertes amb data d'ara. Es refan amb la data real de cada fet: les de fa més
-- d'una setmana, llegides per tothom del grup; les recents, només per l'autor (no llegides per la resta).
delete from public.alerts
 where group_id in ('5eed0001-0000-0000-0000-000000000001', '5eed0001-0000-0000-0000-000000000002');

create temporary table seed_alerts on commit drop as
select r.group_id, r.created_by as user_id, 'restaurant_added' as type, 'Nou restaurant afegit!' as title,
       r.created_by_name || ' ha afegit "' || r.name || '" a la col·lecció del grup.' as message,
       r.id as restaurant_id, r.created_at
  from public.restaurants r
 where r.group_id in ('5eed0001-0000-0000-0000-000000000001', '5eed0001-0000-0000-0000-000000000002')
union all
select w.group_id, w.user_id, 'wishlist_added', 'Nou desitjat proposat!',
       w.user_name || ' vol anar a provar "' || w.restaurant_name || '".', null, w.created_at
  from public.wishlist w
 where w.group_id in ('5eed0001-0000-0000-0000-000000000001', '5eed0001-0000-0000-0000-000000000002')
union all
select v.group_id, v.created_by, 'restaurant_reviewed', 'Nova visita registrada!',
       v.created_by_name || ' ha registrat una visita a "' || r.name || '".', v.restaurant_id, v.created_at
  from public.restaurant_visits v
  join public.restaurants r on r.id = v.restaurant_id
 where v.group_id in ('5eed0001-0000-0000-0000-000000000001', '5eed0001-0000-0000-0000-000000000002')
union all
select m.group_id, m.user_id, 'group_joined', 'Nou membre al grup!',
       p.nickname || ' s''ha unit al grup "' || g.name || '".', null, m.joined_at
  from public.group_members m
  join public.groups g on g.id = m.group_id
  join public.profiles p on p.id = m.user_id
 where m.group_id in ('5eed0001-0000-0000-0000-000000000001', '5eed0001-0000-0000-0000-000000000002')
   and m.user_id <> g.owner_id;

-- notify_group_item purga les alertes de més de 90 dies: no se'n creen de més antigues.
insert into public.alerts (group_id, user_id, type, title, message, restaurant_id, read_by, created_at)
select a.group_id, a.user_id, a.type, a.title, a.message, a.restaurant_id,
       case when a.created_at < now() - interval '7 days'
            then (select array_agg(m.user_id) from public.group_members m where m.group_id = a.group_id)
            else array[a.user_id] end,
       a.created_at
  from seed_alerts a
 where a.created_at > now() - interval '90 days';

commit;
