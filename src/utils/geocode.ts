// Adreça → coordenades amb Nominatim (OpenStreetMap). Política d'ús: https://operations.osmfoundation.org/policies/nominatim/
// Només s'hi consulta quan l'usuari desa un restaurant o demana ubicar-los des del mapa: res d'autocompletat.

export interface Coordinates {
  lat: number;
  lng: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** La política de Nominatim permet com a màxim una petició per segon. */
const MIN_INTERVAL_MS = 1000;
/** Desar un restaurant no s'ha d'encallar si Nominatim no respon. */
const TIMEOUT_MS = 8000;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
};

/** Primer resultat de la resposta de Nominatim, o null si no n'hi ha cap de vàlid. */
export const parseNominatim = (json: unknown): Coordinates | null => {
  if (!Array.isArray(json)) return null;
  const first: unknown = json[0];
  if (typeof first !== 'object' || first === null) return null;
  const { lat, lon } = first as { lat?: unknown; lon?: unknown };
  const coords = { lat: toNumber(lat), lng: toNumber(lon) };
  if (!(Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180)) return null;
  return coords;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Les peticions van en fila i separades com a mínim MIN_INTERVAL_MS, vinguin d'on vinguin.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const request = async (query: string, signal?: AbortSignal): Promise<Coordinates | null> => {
  const delay = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (delay > 0) await wait(delay);
  if (signal?.aborted) return null;
  lastRequestAt = Date.now();
  try {
    const params = new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'ca', q: query });
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

/** Coordenades d'una adreça, o null si no es troba o el servei falla (desar no ha de fallar mai per això). */
export const geocodeAddress = (address: string, signal?: AbortSignal): Promise<Coordinates | null> => {
  const query = address.trim();
  if (!query) return Promise.resolve(null);
  const result = queue.then(() => request(query, signal));
  queue = result;
  return result;
};
