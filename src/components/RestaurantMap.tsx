import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import { Restaurant } from '../types';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { Button } from './Button';

interface Props {
  restaurants: Restaurant[]; // ja filtrats: el mapa mostra el mateix que la llista
  onOpen: (restaurant: Restaurant) => void;
  onLocate: (toLocate: Restaurant[], onProgress: (done: number) => void, signal: AbortSignal) => Promise<number>;
}

// Tessel·les d'OpenStreetMap: cal citar-ne la font (https://operations.osmfoundation.org/policies/tiles/).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const DEFAULT_CENTER: L.LatLngTuple = [41.3874, 2.1686]; // Barcelona, si encara no n'hi ha cap d'ubicat
const DEFAULT_ZOOM = 12;
const MAX_ZOOM = 19;
/** En ajustar el mapa als punts, no s'acosta més que això (amb un sol restaurant quedaria massa a prop). */
const MAX_FIT_ZOOM = 16;

const hasCoordinates = (res: Restaurant): res is Restaurant & { lat: number; lng: number } =>
  res.lat !== undefined && res.lng !== undefined;

const markerIcon = (favorite?: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="${cn('block size-4 rounded-full bg-brand ring-2 shadow-md', favorite ? 'ring-amber-400' : 'ring-white')}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

// Contingut del popup amb DOM i textContent: el nom i la cuina els escriu la gent i no poden anar com a HTML.
const popupContent = (res: Restaurant, onOpen: (restaurant: Restaurant) => void) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block text-left';
  const name = document.createElement('span');
  name.className = 'block text-sm font-bold text-stone-900';
  name.textContent = res.name;
  const details = document.createElement('span');
  details.className = 'block text-xs text-stone-500';
  details.textContent = [res.cuisine, res.priceRange, 'Veure detalls →'].filter(Boolean).join(' · ');
  button.append(name, details);
  button.addEventListener('click', () => onOpen(res));
  return button;
};

export const RestaurantMap: React.FC<Props> = ({ restaurants, onOpen, onLocate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const located = useMemo(() => restaurants.filter(hasCoordinates), [restaurants]);
  const toLocate = restaurants.filter((r) => r.address && !hasCoordinates(r));
  const withoutAddress = restaurants.filter((r) => !r.address).length;

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
    for (const res of located) {
      L.marker([res.lat, res.lng], { icon: markerIcon(res.favorite), title: res.name, alt: res.name })
        .bindPopup(() => popupContent(res, (r) => onOpenRef.current(r)))
        .addTo(markers);
    }
  }, [located]);

  // Només es reenquadra quan canvien els punts (filtres, ubicacions noves), no en cada refresc de dades:
  // `located` és un objecte nou a cada refresc, boundsKey només canvia si canvien els punts.
  const boundsKey = located.map((r) => `${r.id}:${r.lat}:${r.lng}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || located.length === 0) return;
    map.fitBounds(L.latLngBounds(located.map((r) => [r.lat, r.lng])), { padding: [32, 32], maxZoom: MAX_FIT_ZOOM });
  }, [boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notFound, setNotFound] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const locate = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const pending = toLocate;
    setNotFound(0);
    setProgress({ done: 0, total: pending.length });
    const missed = await onLocate(pending, (done) => setProgress({ done, total: pending.length }), controller.signal);
    if (controller.signal.aborted) return;
    setProgress(null);
    setNotFound(missed);
  };

  return (
    <div className="space-y-3">
      {(toLocate.length > 0 || progress || notFound > 0 || withoutAddress > 0) && (
        <div className={cn(CARD, 'px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm')} aria-live="polite">
          {progress ? (
            <span className="flex items-center gap-2 font-medium text-stone-700">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Ubicant restaurants… {progress.done}/{progress.total}
            </span>
          ) : (
            toLocate.length > 0 && (
              <>
                <span className="font-medium text-stone-700">
                  {toLocate.length === 1 ? '1 restaurant encara no és al mapa' : `${toLocate.length} restaurants encara no són al mapa`}
                </span>
                <Button onClick={locate} variant="secondary" size="sm">
                  <MapPin className="w-3.5 h-3.5 text-accent" /> Ubicar-los
                </Button>
              </>
            )
          )}
          {notFound > 0 && !progress && (
            <span className="text-stone-500">
              No s'ha trobat l'adreça de {notFound === 1 ? '1 restaurant' : `${notFound} restaurants`}: revisa-la i torna-ho a provar.
            </span>
          )}
          {withoutAddress > 0 && (
            <span className="text-stone-500 sm:ml-auto">
              {withoutAddress === 1 ? '1 restaurant no té adreça' : `${withoutAddress} restaurants no tenen adreça`}
            </span>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="restaurant-map relative z-0 h-[60vh] min-h-80 rounded-3xl overflow-hidden shadow-card ring-1 ring-stone-200"
        aria-label="Mapa dels restaurants"
      />
    </div>
  );
};
