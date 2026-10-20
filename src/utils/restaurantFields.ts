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

export const PRICE_RANGES = ['1-10 €', '10-20 €', '20-30 €', '30-40 €', '40-50 €', '50 € o més'];
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
