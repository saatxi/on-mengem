-- join_group_by_code sense curses (revisió de seguretat d'octubre de 2026):
-- 1. Un bloqueig consultiu per usuari, com el de les quotes, fa exacte el límit d'intents fallits. Abans, unes
--    quantes peticions en paral·lel llegien el mateix recompte i podien passar una mica dels 10 cada 10 minuts.
-- 2. La fila del grup es llegeix amb for share: si l'owner expulsa algú al mateix moment, la unió espera el codi nou
--    (regenerate_code_on_kick) i ja no entra amb l'antic.

-- Igual que a 0001_init.sql, més els dos bloquejos.
create or replace function public.join_group_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  nick text;
  g public.groups;
  was_member boolean;
  recent int;
begin
  if uid is null then raise exception 'No autenticat'; end if;

  perform pg_advisory_xact_lock(hashtextextended('join:' || uid::text, 0));
  delete from public.join_attempts where user_id = uid and attempted_at < now() - interval '1 day';
  select count(*) into recent from public.join_attempts
   where user_id = uid and attempted_at > now() - interval '10 minutes';
  if recent >= 10 then return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS'); end if;

  select * into g from public.groups where code = upper(trim(p_code)) for share;
  if not found then
    insert into public.join_attempts (user_id) values (uid);
    return jsonb_build_object('error', 'GROUP_NOT_FOUND');
  end if;

  select coalesce(nickname, 'Gourmet') into nick from public.profiles where id = uid;
  was_member := exists (select 1 from public.group_members where group_id = g.id and user_id = uid);

  if not was_member then
    insert into public.group_members (group_id, user_id) values (g.id, uid);
    insert into public.alerts (group_id, user_id, type, title, message)
    values (g.id, uid, 'group_joined', 'Nou membre al grup!',
            nick || ' s''ha unit al grup "' || g.name || '".');
  end if;

  update public.profiles set active_group_id = g.id where id = uid;
  return jsonb_build_object('id', g.id, 'name', g.name, 'already_member', was_member);
end $$;
