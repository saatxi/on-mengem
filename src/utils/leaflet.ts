import L from 'leaflet';
import { cn } from './cn';

// Peces comunes dels mapes de l'app (vista de mapa i selector d'ubicació del formulari).

// Tessel·les d'OpenStreetMap: cal citar-ne la font (https://operations.osmfoundation.org/policies/tiles/).
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const MAX_ZOOM = 19;

interface MarkerOptions {
  favorite?: boolean;
  /** Un desitjat: violeta en lloc del degradat de marca. */
  wish?: boolean;
  large?: boolean;
}

/** Punt d'un restaurant (degradat de marca, anell ambre si és favorit) o d'un desitjat (violeta). */
export const markerIcon = ({ favorite = false, wish = false, large = false }: MarkerOptions = {}) => {
  const size = large ? 24 : 16;
  return L.divIcon({
    className: '',
    html: `<span class="${cn(
      'block rounded-full shadow-md',
      wish ? 'bg-violet-600' : 'bg-brand',
      large ? 'size-6 ring-4' : 'size-4 ring-2',
      favorite ? 'ring-amber-400' : 'ring-white',
    )}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 2)],
  });
};
