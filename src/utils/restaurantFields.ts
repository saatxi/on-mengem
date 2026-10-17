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
