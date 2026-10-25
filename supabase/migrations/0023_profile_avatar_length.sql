-- profiles.avatar no tenia límit de mida, a diferència de nickname. L'app només hi desa un emoji del selector, però
-- el client el pot editar directament (0018) i podia guardar-hi un text llarg que veuen tots els companys de grup.
-- 16 caràcters deixen marge per als emojis compostos (amb ZWJ, to de pell o bandera).

-- Les files que ja no compleixen el límit (no n'hi hauria d'haver cap) tornen a l'avatar per defecte.
update public.profiles set avatar = '🍕' where char_length(avatar) not between 1 and 16;

alter table public.profiles add constraint profiles_avatar_length check (char_length(avatar) between 1 and 16);
