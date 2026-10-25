// Camps compartits pels formularis de restaurants i desitjats.

export const CUISINES = [
  'Mediterrània',
  'Espanyola',
  'Catalana',
  'Basca',
  'Italiana',
  'Japonesa',
  'Asiàtica',
  'Índia',
  'Orient Mitjà',
  'Americana',
  'Marisc',
  'Bar',
  'Cerveseria',
  'Vinoteca',
  'Cafè',
  'Fleca',
  'Postres',
  'Esmorzar',
  'Brunch',
  'Graella',
  'Menjar ràpid',
  'Vegetariana',
];

// Emoji i to (hue OKLCH del fons bg-cuisine) de cada cuina
export const CUISINE_STYLES: Record<string, { emoji: string; hue: number }> = {
  'Mediterrània': { emoji: '🫒', hue: 130 },
  'Espanyola': { emoji: '🥘', hue: 45 },
  'Catalana': { emoji: '🍅', hue: 30 },
  'Basca': { emoji: '🍢', hue: 60 },
  'Italiana': { emoji: '🍝', hue: 25 },
  'Japonesa': { emoji: '🍣', hue: 10 },
  'Asiàtica': { emoji: '🥢', hue: 350 },
  'Índia': { emoji: '🍛', hue: 70 },
  'Orient Mitjà': { emoji: '🧆', hue: 85 },
  'Americana': { emoji: '🍔', hue: 50 },
  'Marisc': { emoji: '🦐', hue: 230 },
  'Bar': { emoji: '🍸', hue: 200 },
  'Cerveseria': { emoji: '🍺', hue: 90 },
  'Vinoteca': { emoji: '🍷', hue: 320 },
  'Cafè': { emoji: '☕', hue: 60 },
  'Fleca': { emoji: '🥖', hue: 75 },
  'Postres': { emoji: '🍰', hue: 350 },
  'Esmorzar': { emoji: '🥐', hue: 80 },
  'Brunch': { emoji: '🥞', hue: 65 },
  'Graella': { emoji: '🥩', hue: 20 },
  'Menjar ràpid': { emoji: '🍟', hue: 95 },
  'Vegetariana': { emoji: '🥗', hue: 145 },
};

const DEFAULT_CUISINE_STYLE = { emoji: '🍽️', hue: 40 };

/** Emoji i to d'una cuina; les desconegudes o buides tenen el plat genèric. */
export const cuisineStyle = (cuisine?: string) => (cuisine && CUISINE_STYLES[cuisine]) || DEFAULT_CUISINE_STYLE;

export const PRICE_RANGES =['1-10 €', '10-20 €', '20-30 €', '30-40 €', '40-50 €', '50 € o més'];
export const DEFAULT_PRICE_RANGE = '10-20 €';

// Patró de l'input: «@usuari», «usuari» o un enllaç a instagram.com (compatible amb la bandera `v`)
export const INSTAGRAM_INPUT_PATTERN =
  '\\s*(@?[A-Za-z0-9._]{1,30}|(https?://)?(www\\.)?instagram\\.com/[A-Za-z0-9._]{1,30}(/.*|\\?.*)?)\\s*';

export const INSTAGRAM_INPUT_MESSAGE = "Escriu un nom d'usuari (@usuari) o un enllaç a instagram.com";

// Accepta «@usuari», «usuari» o un enllaç a instagram.com i en retorna només el nom d'usuari
export const toInstagramHandle = (value: string) =>
  value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0];

export const isInstagramHandle = (value?: string): value is string =>
  !!value && /^[A-Za-z0-9._]{1,30}$/.test(value);

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle}/`;

// Cerca a Google Maps pel nom i, si n'hi ha, l'adreça
export const mapsUrl = (name: string, address?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address].filter(Boolean).join(', '))}`;

// Data d'avui (AAAA-MM-DD) en hora local; toISOString() la donaria en UTC i entre les 00:00 i les 02:00 seria ahir
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Retorna l'enllaç només si és http(s); qualsevol altre esquema (javascript:, data:…) es descarta
export const safeHttpUrl = (url?: string) => (url && /^https?:\/\//i.test(url) ? url : undefined);

// Helpers de visites
import type { Restaurant, Visit } from '../types';

/** Retorna cert si el restaurant té almenys una visita. */
export const isVisited = (r: Restaurant) => r.visits.length > 0;

/** Retorna la visita més recent, o undefined. */
export const lastVisit = (r: Restaurant): Visit | undefined => r.visits[0];

/** Mitjana de valoracions de les visites que en tenen. */
export const visitAverage = (r: Restaurant): number | null => {
  const rated = r.visits.filter((v) => v.rating != null && v.rating > 0);
  if (!rated.length) return null;
  return rated.reduce((sum, v) => sum + v.rating!, 0) / rated.length;
};

/** Retorna cert si l'usuari pot editar o esborrar la visita.
 * Equivalent a la funció SQL can_edit_visit, però al client. */
export const canEditVisit = (visit: Visit, uid: string): boolean => {
  if (visit.groupId === null) return visit.createdBy === uid;
  return visit.shared || visit.createdBy === uid || visit.createdBy == null;
};

// Cerca

/** Text en minúscules i sense accents ni dièresis, per comparar «mediterrania» amb «Mediterrània». */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Retorna cert si algun dels camps conté la cerca (sense distingir majúscules ni accents). */
export const matchesQuery = (query: string, fields: (string | undefined)[]) => {
  const q = normalizeText(query);
  return !q || fields.some((field) => !!field && normalizeText(field).includes(q));
};

// Ordenació

export type RestaurantSort = 'recent' | 'name' | 'rating' | 'lastVisit';

export const RESTAURANT_SORTS: Record<RestaurantSort, string> = {
  recent: 'Afegits recentment',
  name: 'Nom (A-Z)',
  rating: 'Millor valorats',
  lastVisit: 'Visitats fa menys',
};

const shownRating = (r: Restaurant) => visitAverage(r) ?? r.rating ?? null;

/** Retorna una còpia ordenada; els que no tenen el valor (sense nota, sense visites) van al final. */
export const sortRestaurants = (list: Restaurant[], sort: RestaurantSort): Restaurant[] => {
  const byName = (a: Restaurant, b: Restaurant) => a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });
  const desc = (a: string | number | null | undefined, b: string | number | null | undefined) => {
    if (a == null) return b == null ? 0 : 1;
    if (b == null) return -1;
    return a < b ? 1 : a > b ? -1 : 0;
  };
  const compare: Record<RestaurantSort, (a: Restaurant, b: Restaurant) => number> = {
    recent: (a, b) => desc(a.createdAt, b.createdAt) || byName(a, b),
    name: byName,
    rating: (a, b) => desc(shownRating(a), shownRating(b)) || byName(a, b),
    lastVisit: (a, b) => desc(lastVisit(a)?.visitedOn, lastVisit(b)?.visitedOn) || byName(a, b),
  };
  return [...list].sort(compare[sort]);
};
