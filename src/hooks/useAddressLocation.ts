import { useEffect, useRef, useState } from 'react';
import { searchAddress, type AddressMatch, type Area, type Coordinates } from '../utils/geocode';

/** Resultat de la darrera cerca d'una adreça; si l'adreça canvia, ja no hi compta. */
interface AddressLookup {
  address: string;
  result: 'found' | 'notFound' | 'failed';
}

type LookupResult = AddressLookup['result'];

interface Initial {
  address?: string;
  lat?: number;
  lng?: number;
  city?: string;
  district?: string;
}

const NO_AREA: Area = { city: null, district: null };

/**
 * Adreça, punt del mapa, població i zona d'un formulari (restaurant o desitjat). La cerca proposa el primer resultat
 * de Nominatim, que l'usuari pot canviar per un altre o ajustar al mapa (ajustar-lo no en canvia la zona). En editar,
 * el punt i la zona que ja tenia es donen per bons.
 */
export function useAddressLocation(initial: Initial) {
  const initialLocation = initial.lat !== undefined && initial.lng !== undefined ? { lat: initial.lat, lng: initial.lng } : null;
  const [address, setAddress] = useState(initial.address ?? '');
  const [location, setLocation] = useState<Coordinates | null>(initialLocation);
  const [area, setArea] = useState<Area>({ city: initial.city ?? null, district: initial.district ?? null });
  const [lookup, setLookup] = useState<AddressLookup | null>(
    initialLocation && initial.address ? { address: initial.address.trim(), result: 'found' } : null,
  );
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [searching, setSearching] = useState(false);
  // La cerca l'ha llançat el botó de desar: cal que l'usuari miri el punt i torni a desar.
  const [reviewBeforeSave, setReviewBeforeSave] = useState(false);
  const searchRef = useRef<AbortController | null>(null);
  useEffect(() => () => searchRef.current?.abort(), []);

  const trimmedAddress = address.trim();
  const lookupResult = lookup?.address === trimmedAddress ? lookup.result : null;
  const located = lookupResult === 'found' ? location : null;

  /** Busca l'adreça i en proposa el primer resultat. Retorna null si una altra cerca l'ha substituïda. */
  const search = async (fromSubmit = false): Promise<LookupResult | null> => {
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    const query = trimmedAddress;
    setSearching(true);
    const found = await searchAddress(query, controller.signal);
    if (controller.signal.aborted) return null;
    setSearching(false);

    const result = found === null ? 'failed' : found.length > 0 ? 'found' : 'notFound';
    setMatches(found ?? []);
    if (found?.[0]) choose(found[0]);
    else {
      setLocation(null);
      setArea(NO_AREA);
    }
    setLookup({ address: query, result });
    setReviewBeforeSave(fromSubmit && result === 'found');
    return result;
  };

  /** Tria un dels resultats de la cerca: n'agafa el punt, la població i la zona. */
  const choose = (match: AddressMatch) => {
    setLocation({ lat: match.lat, lng: match.lng });
    setArea({ city: match.city, district: match.district });
  };

  /**
   * Per al botó de desar: una adreça sense comprovar es busca primer, perquè l'usuari vegi on queda o que no s'ha
   * trobat, i llavors no es desa. Si el servei no respon, es desa igualment: es podrà ubicar més tard des del mapa.
   */
  const readyToSave = async (): Promise<boolean> => {
    if (!trimmedAddress || lookupResult !== null) return true;
    return (await search(true)) === 'failed';
  };

  return {
    address,
    setAddress,
    search,
    searching,
    lookupResult,
    matches,
    choose,
    /** Punt que es desarà per a l'adreça actual, o null si no n'hi ha (o encara no s'ha buscat). */
    located,
    /** Mou el punt al mapa; la població i la zona no canvien. */
    setLocation,
    reviewBeforeSave,
    readyToSave,
    /** Camps per desar: l'adreça i, si s'ha ubicat, les coordenades, la població i la zona. */
    values: {
      address: trimmedAddress.slice(0, 200),
      lat: located?.lat,
      lng: located?.lng,
      city: (located && area.city) || undefined,
      district: (located && area.district) || undefined,
    },
  };
}

export type AddressLocation = ReturnType<typeof useAddressLocation>;
