import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '../utils/geocode';
import { ATTRIBUTION, MAX_ZOOM, TILE_URL, markerIcon } from '../utils/leaflet';

interface Props {
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
  /** Punt violeta (desitjat) en lloc del de restaurant. */
  wish?: boolean;
}

/** Prou a prop per distingir un carrer d'un altre. */
const ZOOM = 17;

// Mapa petit del formulari amb el punt del restaurant: s'arrossega o es toca el mapa per corregir-lo.
export const LocationPicker: React.FC<Props> = ({ value, onChange, wish = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // El mapa es crea un cop (el valor inicial només el centra): els canvis de valor posteriors els aplica l'efecte de sota.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [value.lat, value.lng],
      zoom: ZOOM,
      // Dins d'un formulari que es desplaça: la roda no fa zoom i, al mòbil, un dit desplaça el formulari, no el mapa.
      scrollWheelZoom: false,
      dragging: !L.Browser.mobile,
    });
    L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: ATTRIBUTION }).addTo(map);
    const marker = L.marker([value.lat, value.lng], {
      icon: markerIcon({ wish, large: true }),
      draggable: true,
      title: 'Ubicació del restaurant',
      alt: 'Ubicació del restaurant',
    }).addTo(map);

    // wrap(): en una còpia del món al costat, Leaflet dona longituds fora de ±180 (la BD les rebutjaria).
    const move = (latlng: L.LatLng) => {
      const { lat, lng } = latlng.wrap();
      onChangeRef.current({ lat, lng });
    };
    marker.on('dragend', () => move(marker.getLatLng()));
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      move(e.latlng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    // El modal s'obre amb una animació: la mida definitiva del contenidor arriba després de crear el mapa.
    const resize = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Un altre resultat de la cerca: s'hi mou el punt i el mapa. Si el canvi ve del mateix punt, ja hi és.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (current.lat === value.lat && current.lng === value.lng) return;
    marker.setLatLng([value.lat, value.lng]);
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), ZOOM));
  }, [value.lat, value.lng]);

  return (
    <div
      ref={containerRef}
      className="restaurant-map relative z-0 h-48 rounded-2xl overflow-hidden ring-1 ring-stone-200"
      aria-label="Mapa amb la ubicació del restaurant"
    />
  );
};
