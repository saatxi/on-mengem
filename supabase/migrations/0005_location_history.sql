-- Moure el punt d'un restaurant al mapa (des del formulari, sense canviar l'adreça) queda a l'historial del grup i es
-- pot desfer. Abans, les coordenades només s'hi desaven quan canviava l'adreça. Ubicar un restaurant que encara no en
-- tenia (botó «Ubicar-los» del mapa o en convertir un desitjat) continua sense deixar-hi cap entrada.

-- Mateix cos que a 0001, amb la condició de les coordenades ampliada.
create or replace function public.record_group_change(p_group_id uuid, p_item_type text, p_item_id uuid, p_item_name text,
                                                      p_action text, p_before jsonb, p_after jsonb default null::jsonb)
    returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare
  uid uuid := auth.uid();
  nick text;
  before_data jsonb := p_before;
  after_data jsonb;
begin
  if p_action = 'update' then
    select jsonb_object_agg(f, p_before -> f), jsonb_object_agg(f, p_after -> f)
      into before_data, after_data
      from unnest(public.history_fields(p_item_type)) as f
     where nullif(p_before ->> f, '') is distinct from nullif(p_after ->> f, '');
    -- Coordenades d'un restaurant: amb un canvi d'adreça (desfer-lo torna el punt al lloc) o quan es mou un punt que
    -- ja hi era. coalesce: quan només s'ha mogut el punt, cap camp de history_fields ha canviat.
    if p_item_type = 'restaurant'
       and (coalesce(before_data ? 'address', false)
            or (jsonb_typeof(p_before -> 'lat') = 'number'
                and (p_before -> 'lat', p_before -> 'lng') is distinct from (p_after -> 'lat', p_after -> 'lng'))) then
      before_data := coalesce(before_data, '{}'::jsonb) || jsonb_build_object('lat', p_before -> 'lat', 'lng', p_before -> 'lng');
      after_data := coalesce(after_data, '{}'::jsonb) || jsonb_build_object('lat', p_after -> 'lat', 'lng', p_after -> 'lng');
    end if;
    if before_data is null then return; end if;
  end if;

  select nickname into nick from public.profiles where id = uid;
  insert into public.group_changes (group_id, item_type, item_id, item_name, action, old_data, new_data,
                                    changed_by, changed_by_name)
  values (p_group_id, p_item_type, p_item_id, p_item_name, p_action, before_data, after_data, uid, nick);

  delete from public.group_changes
   where group_id = p_group_id
     and (created_at < now() - interval '90 days'
          or id in (select id from public.group_changes where group_id = p_group_id
                     order by created_at desc, id offset public.quota_limit('group_changes')));
end $$;
