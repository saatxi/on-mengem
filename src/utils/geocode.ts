// Adreça → coordenades (i coordenades → població i zona) amb Nominatim (OpenStreetMap).
// Política d'ús: https://operations.osmfoundation.org/policies/nominatim/
// Només s'hi consulta quan l'usuari busca o desa una adreça, o demana ubicar els llocs (o completar-ne la zona) des del
// mapa: res d'autocompletat.

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Població i zona (districte o barri) d'una adreça; buides si Nominatim no les dona. */
export interface Area {
  city: string | null;
  district: string | null;
}

/** Un resultat de la cerca: coordenades, població, zona i l'adreça completa que en dona Nominatim. */
export interface AddressMatch extends Coordinates, Area {
  label: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
/** La política de Nominatim permet com a màxim una petició per segon. */
const MIN_INTERVAL_MS = 1000;
/** Desar un restaurant no s'ha d'encallar si Nominatim no respon. */
const TIMEOUT_MS = 8000;
/** Resultats que es mostren per triar quan una adreça és ambigua. */
const MAX_MATCHES = 5;
/** Com les columnes city i district de la BD. */
const MAX_AREA_LENGTH = 80;

// Camps d'`address` de Nominatim, del més precís al més general. La població és el municipi o el nucli; la zona, el
// districte (Gràcia a Barcelona) o, on no n'hi ha, el barri (el Barri Vell a Girona).
const CITY_FIELDS = ['city', 'town', 'village', 'municipality', 'hamlet'];
const DISTRICT_FIELDS = ['suburb', 'city_district', 'neighbourhood', 'quarter'];

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
};

const firstField = (address: Record<string, unknown>, fields: string[]): string | null => {
  for (const field of fields) {
    const value = address[field];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, MAX_AREA_LENGTH);
  }
  return null;
};

/** Població i zona de l'objecte `address` d'un resultat de Nominatim (amb `addressdetails=1`). */
export const parseArea = (address: unknown): Area => {
  if (typeof address !== 'object' || address === null) return { city: null, district: null };
  const fields = address as Record<string, unknown>;
  return { city: firstField(fields, CITY_FIELDS), district: firstField(fields, DISTRICT_FIELDS) };
};

/** Un resultat de Nominatim, o null si no té coordenades vàlides. */
const parseMatch = (item: unknown): AddressMatch | null => {
  if (typeof item !== 'object' || item === null) return null;
  const { lat, lon, display_name, address } = item as { lat?: unknown; lon?: unknown; display_name?: unknown; address?: unknown };
  const coords = { lat: toNumber(lat), lng: toNumber(lon) };
  if (!(Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180)) return null;
  return { ...coords, ...parseArea(address), label: typeof display_name === 'string' ? display_name : '' };
};

/** Resultats vàlids d'una cerca de Nominatim, en el mateix ordre (el primer és el més probable). */
export const parseNominatim = (json: unknown): AddressMatch[] => {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item: unknown) => parseMatch(item) ?? []);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Les peticions van en fila i separades com a mínim MIN_INTERVAL_MS, vinguin d'on vinguin.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Resposta JSON de Nominatim, o null si el servei falla o no respon. */
const request = async (path: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> => {
  const delay = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (delay > 0) await wait(delay);
  if (signal?.aborted) return null;
  lastRequestAt = Date.now();
  try {
    const query = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'ca', ...params });
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await fetch(`${NOMINATIM_URL}/${path}?${query}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const enqueue = (path: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> => {
  const result = queue.then(() => request(path, params, signal));
  queue = result;
  return result;
};

const search = async (query: string, limit: number, signal?: AbortSignal): Promise<AddressMatch[] | null> => {
  const json = await enqueue('search', { q: query, limit: String(limit) }, signal);
  return json === null ? null : parseNominatim(json);
};

/**
 * Fins a MAX_MATCHES resultats d'una adreça perquè l'usuari triï el bo: una llista buida vol dir que no s'ha trobat,
 * i null, que no s'ha pogut consultar.
 */
export const searchAddress = (address: string, signal?: AbortSignal): Promise<AddressMatch[] | null> => {
  const query = address.trim();
  if (!query) return Promise.resolve([]);
  return search(query, MAX_MATCHES, signal);
};

/** Primer resultat d'una adreça, o null si no es troba o el servei falla (desar no ha de fallar mai per això). */
export const geocodeAddress = async (address: string, signal?: AbortSignal): Promise<AddressMatch | null> => {
  const query = address.trim();
  if (!query) return null;
  const [first] = (await search(query, 1, signal)) ?? [];
  return first ?? null;
};

/** Població i zona d'un punt (geocodificació inversa), sense moure'l; null si el servei falla o no hi troba res. */
export const areaOf = async ({ lat, lng }: Coordinates, signal?: AbortSignal): Promise<Area | null> => {
  const json = await enqueue('reverse', { lat: String(lat), lon: String(lng), zoom: '18' }, signal);
  if (typeof json !== 'object' || json === null || 'error' in json) return null;
  const area = parseArea((json as { address?: unknown }).address);
  return area.city || area.district ? area : null;
};
