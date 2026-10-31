import React, { lazy, Suspense } from 'react';
import { Dices, Plus, Search, Star, UtensilsCrossed, X } from 'lucide-react';
import { Restaurant } from '../types';
import { RESTAURANT_SORTS, type RestaurantSort } from '../utils/restaurantFields';
import { VISITED_FILTERS, type RestaurantFilters } from '../hooks/useRestaurantFilters';
import { oneOfKeys, usePersistentState } from '../hooks/usePersistentState';
import { cn } from '../utils/cn';
import { CARD, CHIP_SELECT, EMPTY_STATE, FIELD } from '../utils/ui';
import { AreaSelect } from './AreaSelect';
import { Button } from './Button';
import { CardSkeletons } from './CardSkeletons';
import { RestaurantCard } from './RestaurantCard';
import { SegmentedControl } from './SegmentedControl';
import { PLACE_VIEWS, ViewToggle, type PlaceView } from './ViewToggle';

// Leaflet només es descarrega quan s'obre la vista de mapa.
const PlacesMap = lazy(() => import('./PlacesMap').then((m) => ({ default: m.PlacesMap })));

// Botons i selectors petits de la barra de filtres
const CHIP =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-[background-color,color,transform] active:scale-[0.96]';
const CHIP_IDLE = 'bg-surface text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100';

interface Props {
  restaurants: Restaurant[];
  filters: RestaurantFilters;
  loading: boolean;
  isPersonal: boolean;
  onAdd: () => void;
  onOpen: (restaurant: Restaurant) => void;
  onOpenRandom: () => void;
  onToggleFavorite: (restaurant: Restaurant) => void;
  onRegisterVisit: (restaurant: Restaurant) => void;
  onLocate: React.ComponentProps<typeof PlacesMap>['onLocate'];
}

export const RestaurantsTab: React.FC<Props> = ({
  restaurants,
  filters,
  loading,
  isPersonal,
  onAdd,
  onOpen,
  onOpenRandom,
  onToggleFavorite,
  onRegisterVisit,
  onLocate,
}) => {
  const [view, setView] = usePersistentState<PlaceView>('restaurant-view', 'list', oneOfKeys(PLACE_VIEWS));
  const { filtered, hasFilters, clear } = filters;

  return (
    <div className="space-y-5">
      <div className={cn(CARD, 'p-4 sm:p-5 space-y-3')}>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => filters.setQuery(e.target.value)}
              placeholder="Cercar per nom, adreça, cuina, notes..."
              aria-label="Cercar restaurants"
              className={cn(FIELD, 'pl-11 bg-stone-50')}
            />
          </div>

          <Button onClick={onAdd} variant="brand" className="hidden sm:inline-flex">
            <Plus className="w-4 h-4" />
            <span>Afegir restaurant</span>
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100 text-xs">
          <ViewToggle value={view} onChange={setView} />
          <SegmentedControl label="Estat de visita" options={VISITED_FILTERS} value={filters.visited} onChange={filters.setVisited} />

          <button
            onClick={() => filters.setFavorite(!filters.favorite)}
            aria-pressed={filters.favorite}
            className={cn(CHIP, filters.favorite ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' : CHIP_IDLE)}
          >
            <Star className={cn('w-3.5 h-3.5', filters.favorite ? 'fill-white' : 'fill-amber-400 text-amber-500')} />
            <span>Favorits</span>
          </button>

          {filters.cuisines.length > 1 && (
            <select value={filters.cuisine} onChange={(e) => filters.setCuisine(e.target.value)} aria-label="Cuina" className={CHIP_SELECT}>
              <option value={filters.allCuisines}>Totes les cuines</option>
              {filters.cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <AreaSelect areas={filters.areas} value={filters.area} onChange={filters.setArea} />

          <button
            onClick={onOpenRandom}
            disabled={filtered.length === 0}
            title="Obre un dels restaurants de la llista a l'atzar"
            className={cn(CHIP, CHIP_IDLE, 'disabled:opacity-40')}
          >
            <Dices className="w-3.5 h-3.5 text-accent" />
            <span>Sorprèn-me</span>
          </button>

          <select
            value={filters.sort}
            onChange={(e) => filters.setSort(e.target.value as RestaurantSort)}
            aria-label="Ordena per"
            className={CHIP_SELECT}
          >
            {(Object.keys(RESTAURANT_SORTS) as RestaurantSort[]).map((key) => (
              <option key={key} value={key}>
                {RESTAURANT_SORTS[key]}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clear} className={cn(CHIP, 'gap-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100')}>
              <X className="w-3.5 h-3.5" />
              <span>Netejar filtres</span>
            </button>
          )}

          <span className="ml-auto text-stone-500 text-xs font-medium" aria-live="polite">
            {filtered.length} de {restaurants.length} llocs
          </span>
        </div>
      </div>

      {loading ? (
        <CardSkeletons className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />
      ) : filtered.length === 0 ? (
        <div className={EMPTY_STATE}>
          <div className="w-16 h-16 rounded-3xl bg-brand text-white shadow-lg shadow-accent/30 flex items-center justify-center mx-auto -rotate-6">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Cap restaurant trobat</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            {hasFilters
              ? 'No hi ha resultats amb els filtres seleccionats.'
              : isPersonal
                ? 'El teu espai personal és buit. Afegeix els teus restaurants i després comparteix-los amb els teus grups!'
                : 'Encara no hi ha restaurants al grup. Sigues el primer a afegir-ne un!'}
          </p>
          {hasFilters ? (
            <Button onClick={clear} variant="secondary">
              <X className="w-4 h-4" /> Netejar filtres
            </Button>
          ) : (
            <Button onClick={onAdd} variant="brand">
              <Plus className="w-4 h-4" /> Afegir el primer restaurant
            </Button>
          )}
        </div>
      ) : view === 'map' ? (
        <Suspense fallback={<div className={cn(CARD, 'h-[60vh] min-h-80 animate-pulse')} />}>
          <PlacesMap
            places={filtered.map((r) => ({ ...r, details: [r.cuisine ?? '', r.priceRange ?? ''] }))}
            kind="restaurant"
            openLabel="Veure detalls →"
            onOpen={(id) => {
              const res = filtered.find((r) => r.id === id);
              if (res) onOpen(res);
            }}
            onLocate={onLocate}
          />
        </Suspense>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {filtered.map((res) => (
            <RestaurantCard key={res.id} res={res} onOpen={onOpen} onToggleFavorite={onToggleFavorite} onRegisterVisit={onRegisterVisit} />
          ))}
        </div>
      )}
    </div>
  );
};
