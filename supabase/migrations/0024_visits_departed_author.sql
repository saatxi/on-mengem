-- Una visita privada només la podia editar o esborrar l'autor, o qualsevol membre si l'autor havia esborrat el
-- compte (created_by NULL). Si l'autor sortia del grup o n'era expulsat, ningú no la podia tocar. Ara es tracta com
-- quan ha esborrat el compte: qualsevol membre la pot editar o esborrar, i queda a l'historial. Canviar si és privada
-- continua sent només cosa de l'autor (save_visit).

-- Igual que a 0003_restaurant_visits.sql, més el cas de l'autor que ja no és membre.
create or replace function public.can_edit_visit(p_visit_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_visits v
     where v.id = p_visit_id
       and ((v.group_id is null and v.created_by = auth.uid())
            or (v.group_id is not null and public.is_group_member(v.group_id)
                and (v.shared or v.created_by = auth.uid() or v.created_by is null
                     or not exists (select 1 from public.group_members m
                                     where m.group_id = v.group_id and m.user_id = v.created_by))))
  );
$$;
