// Població i zona (districte o barri) dels restaurants i desitjats: etiquetes i filtre per zona.

interface Placed {
  city?: string;
  district?: string;
}

/** «Gràcia · Barcelona», «Manlleu», o null si no se'n sap la població ni la zona. */
export const areaLabel = ({ city, district }: Placed): string | null =>
  district && city ? `${district} · ${city}` : district || city || null;

/** Valor del filtre sense cap zona triada. */
export const ALL_AREAS = 'all';

/** Valors del filtre: tota una població, o una zona d'una població. */
export const cityFilter = (city: string) => `city:${city}`;
export const districtFilter = (city: string, district: string) => `district:${city}|${district}`;

export interface CityAreas {
  city: string;
  /** Zones d'aquesta població que surten a la llista, en ordre alfabètic (pot ser buida). */
  districts: string[];
}

const byName = (a: string, b: string) => a.localeCompare(b, 'ca', { sensitivity: 'base' });

/** Poblacions de la llista, en ordre alfabètic, amb les seves zones (per al selector del filtre). */
export const cityAreas = (places: Placed[]): CityAreas[] => {
  const byCity = new Map<string, Set<string>>();
  for (const { city, district } of places) {
    if (!city) continue;
    const districts = byCity.get(city) ?? new Set<string>();
    if (district) districts.add(district);
    byCity.set(city, districts);
  }
  return Array.from(byCity, ([city, districts]) => ({ city, districts: Array.from(districts).sort(byName) })).sort((a, b) =>
    byName(a.city, b.city),
  );
};

/** El valor del filtre si encara correspon a alguna zona de la llista; si no (p. ex. és d'un altre espai), cap. */
export const validAreaFilter = (value: string, areas: CityAreas[]): string => {
  const valid = areas.some(
    ({ city, districts }) => value === cityFilter(city) || districts.some((district) => value === districtFilter(city, district)),
  );
  return valid ? value : ALL_AREAS;
};

/** Si un lloc passa el filtre de zona. Els que no tenen població només passen sense filtre. */
export const matchesArea = (place: Placed, value: string): boolean => {
  if (value === ALL_AREAS) return true;
  if (!place.city) return false;
  if (value === cityFilter(place.city)) return true;
  return !!place.district && value === districtFilter(place.city, place.district);
};
