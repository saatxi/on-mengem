-- Realtime amb Broadcast privat en lloc de postgres_changes. Supabase no aplica RLS als events DELETE de
-- postgres_changes i els envia a tots els subscriptors amb la clau primària: qualsevol usuari autenticat veia, per
-- exemple, quins usuaris sortien de quins grups. Ara la BD avisa només qui ho pot veure.
-- 1. Triggers per sentència que envien un avís a canals privats: group:<id> (contingut d'un grup) i user:<id>
--    (espai personal, perfil propi i llista de grups). L'avís només diu quina taula ha canviat: el client torna a
--    llegir les dades, que passen per RLS com sempre.
-- 2. Política a realtime.messages: un usuari només pot escoltar el seu topic user:<id> i els group:<id> dels grups
--    on és membre. Cap client hi pot enviar missatges.
-- 3. Les taules surten de la publicació supabase_realtime (ja no hi ha events postgres_changes).
-- Les versions de l'app anteriors a aquesta migració deixen de rebre canvis en temps real (continuen funcionant, però
-- cal recarregar per veure els canvis dels altres).

-- ---------------------------------------------------------------- 1. Avisos

-- Topics que han de saber que una fila ha canviat. NULL (p. ex. espai personal d'un compte esborrat) no s'envia.
create or replace function public.change_topics(p_table text, p_row jsonb)
returns setof text language plpgsql stable security definer set search_path = '' as $$
declare
  gid uuid;
begin
  -- Grups i membres: la llista de grups de cada membre (nom, owner, membres) i la de qui entra o surt.
  if p_table in ('groups', 'group_members') then
    gid := coalesce(p_row ->> 'group_id', p_row ->> 'id')::uuid;
    return query select 'user:' || m.user_id from public.group_members m where m.group_id = gid;
    if p_table = 'group_members' then return next 'user:' || (p_row ->> 'user_id'); end if;
    return;
  end if;
  if p_table = 'profiles' then
    return next 'user:' || (p_row ->> 'id');
    return;
  end if;
  -- Contingut: el grup o, a l'espai personal, el propietari.
  if p_row ->> 'group_id' is not null then
    return next 'group:' || (p_row ->> 'group_id');
  else
    return next 'user:' || coalesce(p_row ->> 'created_by', p_row ->> 'user_id');
  end if;
end $$;

-- Per sentència i no per fila: una sentència que toca moltes files (p. ex. sync_nickname_to_records) envia un sol
-- avís per topic. Les taules de transició es diuen sempre new_rows i old_rows.
create or replace function public.broadcast_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changed jsonb := '[]'::jsonb;
  t text;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    changed := changed || coalesce((select jsonb_agg(to_jsonb(n)) from new_rows n), '[]'::jsonb);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    changed := changed || coalesce((select jsonb_agg(to_jsonb(o)) from old_rows o), '[]'::jsonb);
  end if;

  for t in
    select distinct c.topic
      from jsonb_array_elements(changed) r
     cross join lateral public.change_topics(tg_table_name, r.value) as c(topic)
     where c.topic is not null
  loop
    perform realtime.send(jsonb_build_object('table', tg_table_name), 'change', t, true);
  end loop;
  return null;
end $$;

-- Les taules de transició no admeten triggers de més d'un event: un per event i taula.
-- visit_attendees no en té: save_visit sempre toca també la fila de la visita, que ja avisa.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('restaurants', 'insert'), ('restaurants', 'update'), ('restaurants', 'delete'),
      ('wishlist', 'insert'), ('wishlist', 'update'), ('wishlist', 'delete'),
      ('restaurant_visits', 'insert'), ('restaurant_visits', 'update'), ('restaurant_visits', 'delete'),
      ('alerts', 'insert'), ('alerts', 'update'), ('alerts', 'delete'),
      ('group_changes', 'insert'), ('group_changes', 'update'), ('group_changes', 'delete'),
      ('groups', 'update'),
      ('group_members', 'insert'), ('group_members', 'delete'),
      ('profiles', 'update')
    ) as s (tbl, ev)
  loop
    execute format(
      'create trigger %I after %s on public.%I referencing %s for each statement execute function public.broadcast_changes()',
      spec.tbl || '_broadcast_' || spec.ev, spec.ev, spec.tbl,
      case spec.ev
        when 'insert' then 'new table as new_rows'
        when 'update' then 'old table as old_rows new table as new_rows'
        else 'old table as old_rows'
      end);
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. Qui pot escoltar cada topic

create or replace function public.can_receive_topic(p_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_topic is null then return false; end if;
  if p_topic = 'user:' || uid::text then return true; end if;
  if p_topic ~ '^group:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.is_group_member(substr(p_topic, 7)::uuid);
  end if;
  return false;
end $$;

-- Realtime ho comprova en connectar-se al canal (amb realtime.topic() = el topic del canal).
-- Sense política d'insert: el client no pot enviar missatges als canals privats.
create policy on_menjem_receive_changes on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.can_receive_topic((select realtime.topic())));

-- ---------------------------------------------------------------- 3. Fora de postgres_changes

alter publication supabase_realtime drop table
  public.profiles, public.groups, public.group_members,
  public.restaurants, public.wishlist, public.alerts,
  public.restaurant_visits, public.visit_attendees, public.group_changes;

-- ---------------------------------------------------------------- Permisos

revoke all on function public.change_topics(text, jsonb) from public, anon, authenticated;
revoke all on function public.broadcast_changes() from public, anon, authenticated;
-- La política s'avalua amb el rol de qui escolta.
revoke all on function public.can_receive_topic(text) from public, anon;
grant execute on function public.can_receive_topic(text) to authenticated;
