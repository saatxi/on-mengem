// Enllaços directes a un restaurant: https://<app>/?r=<id>. RLS decideix qui el pot obrir.

const PARAM = 'r';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const restaurantUrl = (id: string, origin: string) => `${origin}/?${PARAM}=${encodeURIComponent(id)}`;

/** Retorna l'id del restaurant de la query (`?r=`), o null si no n'hi ha o no és un UUID. */
export const readRestaurantParam = (search: string): string | null => {
  const id = new URLSearchParams(search).get(PARAM)?.trim();
  return id && UUID.test(id) ? id.toLowerCase() : null;
};

/** La mateixa URL sense el paràmetre `r` (per netejar la barra d'adreces un cop llegit). */
export const withoutRestaurantParam = (url: string): string => {
  const u = new URL(url);
  u.searchParams.delete(PARAM);
  return u.pathname + u.search + u.hash;
};
