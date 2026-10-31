// Adreça → coordenades amb Nominatim (OpenStreetMap). Política d'ús: https://operations.osmfoundation.org/policies/nominatim/
// Només s'hi consulta quan l'usuari busca o desa una adreça, o demana ubicar els restaurants des del mapa: res d'autocompletat.

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Un resultat de la cerca: coordenades i l'adreça completa que en dona Nominatim. */
export interface AddressMatch extends Coordinates {
  label: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** La política de Nominatim permet com a màxim una petició per segon. */
const MIN_INTERVAL_MS = 1000;
/** Desar un restaurant no s'ha d'encallar si Nominatim no respon. */
const TIMEOUT_MS = 8000;
/** Resultats que es mostren per triar quan una adreça és ambigua. */
const MAX_MATCHES = 5;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
};

/** Resultats vàlids de la resposta de Nominatim, en el mateix ordre (el primer és el més probable). */
export const parseNominatim = (json: unknown): AddressMatch[] => {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return [];
    const { lat, lon, display_name } = item as { lat?: unknown; lon?: unknown; display_name?: unknown };
    const coords = { lat: toNumber(lat), lng: toNumber(lon) };
    if (!(Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180)) return [];
    return [{ ...coords, label: typeof display_name === 'string' ? display_name : '' }];
  });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Les peticions van en fila i separades com a mínim MIN_INTERVAL_MS, vinguin d'on vinguin.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Resultats de la cerca, o null si el servei falla o no respon. */
const request = async (query: string, limit: number, signal?: AbortSignal): Promise<AddressMatch[] | null> => {
  const delay = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (delay > 0) await wait(delay);
  if (signal?.aborted) return null;
  lastRequestAt = Date.now();
  try {
    const params = new URLSearchParams({ format: 'jsonv2', limit: String(limit), 'accept-language': 'ca', q: query });
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) return null;
    return parseNominatim(await response.json());
  } catch {
    return null;
  }
};

const enqueue = (query: string, limit: number, signal?: AbortSignal): Promise<AddressMatch[] | null> => {
  const result = queue.then(() => request(query, limit, signal));
  queue = result;
  return result;
};

/**
 * Fins a MAX_MATCHES resultats d'una adreça perquè l'usuari triï el bo: una llista buida vol dir que no s'ha trobat,
 * i null, que no s'ha pogut consultar.
 */
export const searchAddress = (address: string, signal?: AbortSignal): Promise<AddressMatch[] | null> => {
  const query = address.trim();
  if (!query) return Promise.resolve([]);
  return enqueue(query, MAX_MATCHES, signal);
};

/** Coordenades d'una adreça, o null si no es troba o el servei falla (desar no ha de fallar mai per això). */
export const geocodeAddress = async (address: string, signal?: AbortSignal): Promise<Coordinates | null> => {
  const query = address.trim();
  if (!query) return null;
  const [first] = (await enqueue(query, 1, signal)) ?? [];
  return first ? { lat: first.lat, lng: first.lng } : null;
};
