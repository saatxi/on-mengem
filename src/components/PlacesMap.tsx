import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';
import { ATTRIBUTION, MAX_ZOOM, TILE_URL, markerIcon } from '../utils/leaflet';
import { CARD } from '../utils/ui';
import { Button } from './Button';

/** Un restaurant o un desitjat, tal com el mostra el mapa. */
export interface MapPlace {
  id: string;
  name: string;
  /** Cuina, preu…: la segona línia del popup. */
  details: string[];
  address?: string;
  lat?: number;
  lng?: number;
  city?: string;
  favorite?: boolean;
}

type PlaceKind = 'restaurant' | 'wish';
/** Ubicar els que no tenen punt, o completar la zona dels que ja en tenen. */
type Task = 'locate' | 'area';

// Textos i colors de cada tipus de lloc
const KINDS: Record<PlaceKind, { one: string; many: string; mapLabel: string; icon: string }> = {
  restaurant: { one: 'restaurant', many: 'restaurants', mapLabel: 'Mapa dels restaurants', icon: 'text-accent' },
  wish: { one: 'desitjat', many: 'desitjats', mapLabel: 'Mapa dels desitjats', icon: 'text-violet-700' },
};

interface Props {
  places: MapPlace[]; // ja filtrats: el mapa mostra el mateix que la llista
  kind: PlaceKind;
  /** Text de l'enllaç del popup («Veure detalls →»). */
  openLabel: string;
  onOpen: (id: string) => void;
  onLocate: (toLocate: MapPlace[], onProgress: (done: number) => void, signal: AbortSignal) => Promise<number>;
}

const DEFAULT_CENTER: L.LatLngTuple = [41.3874, 2.1686]; // Barcelona, si encara no n'hi ha cap d'ubicat
const DEFAULT_ZOOM = 12;
/** En ajustar el mapa als punts, no s'acosta més que això (amb un sol lloc quedaria massa a prop). */
const MAX_FIT_ZOOM = 16;

const hasCoordinates = (place: MapPlace): place is MapPlace & { lat: number; lng: number } =>
  place.lat !== undefined && place.lng !== undefined;

// Contingut del popup amb DOM i textContent: el nom i la cuina els escriu la gent i no poden anar com a HTML.
const popupContent = (place: MapPlace, openLabel: string, onOpen: (id: string) => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block text-left';
  const name = document.createElement('span');
  name.className = 'block text-sm font-bold text-stone-900';
  name.textContent = place.name;
  const details = document.createElement('span');
  details.className = 'block text-xs text-stone-500';
  details.textContent = [...place.details, openLabel].filter(Boolean).join(' · ');
  button.append(name, details);
  button.addEventListener('click', () => onOpen(place.id));
  return button;
};

// Mapa dels restaurants o dels desitjats de l'espai, amb el botó per ubicar els que tenen adreça però no punt.
export const PlacesMap: React.FC<Props> = ({ places, kind, openLabel, onOpen, onLocate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const { one, many, mapLabel, icon } = KINDS[kind];
  const count = (n: number) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

  const located = useMemo(() => places.filter(hasCoordinates), [places]);
  const toLocate = places.filter((p) => p.address && !hasCoordinates(p));
  // Ubicats abans que es desés la zona (migració 0007): se'ls completa a partir del punt, sense moure'l
  const withoutArea = located.filter((p) => !p.city);
  const withoutAddress = places.filter((p) => !p.address).length;

  // El mapa es crea un cop i es destrueix en sortir de la vista.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;
    markers.clearLayers();
    for (const place of located) {
      L.marker([place.lat, place.lng], {
        icon: markerIcon({ favorite: place.favorite, wish: kind === 'wish' }),
        title: place.name,
        alt: place.name,
      })
        .bindPopup(() => popupContent(place, openLabel, (id) => onOpenRef.current(id)))
        .addTo(markers);
    }
  }, [located, kind, openLabel]);

  // Només es reenquadra quan canvien els punts (filtres, ubicacions noves), no en cada refresc de dades:
  // `located` és un objecte nou a cada refresc, boundsKey només canvia si canvien els punts.
  const boundsKey = located.map((p) => `${p.id}:${p.lat}:${p.lng}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || located.length === 0) return;
    map.fitBounds(L.latLngBounds(located.map((p) => [p.lat, p.lng])), { padding: [32, 32], maxZoom: MAX_FIT_ZOOM });
  }, [boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Què s'està fent: ubicar els que no tenen punt o completar la zona dels que ja en tenen
  const [progress, setProgress] = useState<{ task: Task; done: number; total: number } | null>(null);
  const [missed, setMissed] = useState<{ task: Task; count: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (task: Task, pending: MapPlace[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setMissed(null);
    setProgress({ task, done: 0, total: pending.length });
    const notDone = await onLocate(pending, (done) => setProgress({ task, done, total: pending.length }), controller.signal);
    if (controller.signal.aborted) return;
    setProgress(null);
    setMissed(notDone > 0 ? { task, count: notDone } : null);
  };

  return (
    <div className="space-y-3">
      {(toLocate.length > 0 || withoutArea.length > 0 || progress || missed || withoutAddress > 0) && (
        <div className={cn(CARD, 'px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm')} aria-live="polite">
          {progress ? (
            <span className="flex items-center gap-2 font-medium text-stone-700">
              <Loader2 className={cn('w-4 h-4 animate-spin', icon)} />
              {progress.task === 'locate' ? `Ubicant ${many}…` : 'Completant zones…'} {progress.done}/{progress.total}
            </span>
          ) : (
            <>
              {toLocate.length > 0 && (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-medium text-stone-700">
                    {count(toLocate.length)} encara no {toLocate.length === 1 ? 'és' : 'són'} al mapa
                  </span>
                  <Button onClick={() => run('locate', toLocate)} variant="secondary" size="sm">
                    <MapPin className={cn('w-3.5 h-3.5', icon)} /> Ubicar-los
                  </Button>
                </span>
              )}
              {withoutArea.length > 0 && (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-medium text-stone-700">{count(withoutArea.length)} sense zona</span>
                  <Button onClick={() => run('area', withoutArea)} variant="secondary" size="sm">
                    <MapPin className={cn('w-3.5 h-3.5', icon)} /> Completar zones
                  </Button>
                </span>
              )}
            </>
          )}
          {missed && !progress && (
            <span className="text-stone-500">
              {missed.task === 'locate'
                ? `No s'ha trobat l'adreça de ${count(missed.count)}: revisa-la i torna-ho a provar.`
                : `No s'ha trobat la zona de ${count(missed.count)}.`}
            </span>
          )}
          {withoutAddress > 0 && (
            <span className="text-stone-500 sm:ml-auto">
              {count(withoutAddress)} no {withoutAddress === 1 ? 'té' : 'tenen'} adreça
            </span>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="restaurant-map relative z-0 h-[60vh] min-h-80 rounded-3xl overflow-hidden shadow-card ring-1 ring-stone-200"
        aria-label={mapLabel}
      />
    </div>
  );
};
