-- Corregeix el nom de l'app (On mengem?) a la política de Realtime de 0015_realtime_broadcast.sql. Es torna a
-- crear amb el nom nou perquè alter policy demana ser l'owner de realtime.messages.
-- El paràmetre intern onmenjem.deleting_user (0012) es manté: canviar-lo obligaria a redefinir-ne les funcions.

drop policy on_menjem_receive_changes on realtime.messages;

create policy on_mengem_receive_changes on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.can_receive_topic((select realtime.topic())));
