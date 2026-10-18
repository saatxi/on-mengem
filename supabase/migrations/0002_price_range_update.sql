-- Amplia el límit de la columna price_range de 8 a 12 caràcters per poder
-- emmagatzemar els nous valors de rang de preu ("50 € o més" = 10 caràcters).
alter table public.restaurants drop constraint if exists restaurants_price_range_check;
alter table public.restaurants add constraint restaurants_price_range_check check (char_length(price_range) <= 12);

alter table public.wishlist drop constraint if exists wishlist_price_range_check;
alter table public.wishlist add constraint wishlist_price_range_check check (char_length(price_range) <= 12);
