alter table public.wishlist add column address text check (char_length(address) <= 200);
