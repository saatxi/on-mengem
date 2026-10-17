// Camps compartits pels formularis de restaurants i desitjats.

export const CUISINES = [
  'Mediterrània',
  'Catalana tradicional',
  'Tapes de mercat',
  'Japonesa & Sushi',
  'Italiana & Pizzes',
  'Braseria & Carn',
  'Mexicana',
  'Hamburgueses gourmet',
  'Fusió & Internacional',
  'Vegetariana & Saludable',
  'Altra',
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
