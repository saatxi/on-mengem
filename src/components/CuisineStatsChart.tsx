import React, { useMemo, useState } from 'react';
import { Restaurant } from '../types';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { isVisited } from '../utils/restaurantFields';
import { cuisineRows, type CuisineRow } from '../utils/stats';
import { Utensils, Award, CheckCircle, TrendingUp, Flame, Star } from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  groupName?: string;
  /** Mida de tota la col·lecció, quan `restaurants` només en té una part (p. ex. els visitats aquest any). */
  collectionSize?: number;
}

type ViewMode = 'visits' | 'total' | 'rating';

const VIEW_LABELS: Record<ViewMode, string> = {
  visits: 'Per visites',
  total: 'Per restaurants',
  rating: 'Per nota',
};

const VIEW_DESCRIPTIONS: Record<ViewMode, string> = {
  visits: ', segons les visites.',
  total: ', segons els restaurants guardats.',
  rating: ', segons la nota mitjana.',
};

// Valor de la barra; les cuines sense cap nota compten com a 0
const rowValue = (row: CuisineRow, mode: ViewMode) => row[mode] ?? 0;

export const CuisineStatsChart: React.FC<Props> = ({ restaurants, groupName, collectionSize = restaurants.length }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visits');

  const rows = useMemo(() => cuisineRows(restaurants), [restaurants]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => rowValue(b, viewMode) - rowValue(a, viewMode) || b.favorites - a.favorites || a.cuisine.localeCompare(b.cuisine, 'ca'),
      ),
    [rows, viewMode],
  );

  const topBy = (key: 'visits' | 'favorites') => {
    const top = rows.reduce<CuisineRow | null>((best, row) => (!best || row[key] > best[key] ? row : best), null);
    return top && top[key] > 0 ? top : null;
  };
  const topVisited = topBy('visits');
  const topFavorite = topBy('favorites');
  const totalVisited = restaurants.filter(isVisited).length;
  const maxValue = viewMode === 'rating' ? 5 : Math.max(1, ...sortedRows.map((row) => rowValue(row, viewMode)));

  if (restaurants.length === 0) {
    return (
      <div className={cn(CARD, 'p-6 text-center py-10')}>
        <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-stone-900">Encara no hi ha dades de cuina</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
          Afegeix restaurants i registra'n les visites per veure quines cuines us agraden més.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-5')}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Cuines</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {groupName ? `Les cuines del grup «${groupName}»` : 'Les cuines del teu espai'}
            {VIEW_DESCRIPTIONS[viewMode]}
          </p>
        </div>

        <div className="flex items-center max-w-full overflow-x-auto rounded-full bg-stone-100 p-1 text-xs font-semibold" role="group" aria-label="Ordre del gràfic">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={cn(
                'shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full transition-[background-color,color,box-shadow]',
                viewMode === mode ? 'bg-surface text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-accent-soft">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800 mb-1">
            <Flame className="w-4 h-4 text-accent" />
            <span>La més visitada</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-stone-900">{topVisited?.cuisine ?? 'Cap encara'}</div>
          <div className="text-xs text-stone-600 mt-0.5">
            {topVisited ? (topVisited.visits === 1 ? '1 visita' : `${topVisited.visits} visites`) : 'Sense visites registrades'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
            <Award className="w-4 h-4 text-amber-600" />
            <span>La més preferida</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-stone-900">{topFavorite?.cuisine ?? 'Cap encara'}</div>
          <div className="text-xs text-stone-600 mt-0.5">
            {topFavorite ? (topFavorite.favorites === 1 ? '1 favorit' : `${topFavorite.favorites} favorits`) : 'Sense favorits'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-emerald-50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Restaurants visitats</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-stone-900 tabular-nums">
            {totalVisited} de {collectionSize}
          </div>
          <div className="text-xs text-stone-600 mt-0.5">
            {Math.round((totalVisited / Math.max(1, collectionSize)) * 100)}% de la col·lecció provada
          </div>
        </div>
      </div>

      <ul className="space-y-2.5" aria-label={`Cuines ${VIEW_LABELS[viewMode].toLowerCase()}`}>
        {sortedRows.map((row) => {
          const value = rowValue(row, viewMode);
          return (
            <li key={row.cuisine} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-xs">
              <span className="truncate font-semibold text-stone-700" title={row.cuisine}>
                {row.cuisine}
              </span>
              <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500"
                  style={{ width: `${(value / maxValue) * 100}%` }}
                />
              </div>
              <span className="flex items-center gap-2 justify-end tabular-nums">
                <strong className={cn('text-right text-stone-800', viewMode === 'rating' ? 'w-7' : 'w-6')}>
                  {viewMode !== 'rating' ? value : row.rating == null ? '—' : value.toFixed(1)}
                </strong>
                <span
                  className={cn('flex items-center gap-0.5 w-7 text-amber-600', row.favorites === 0 && 'invisible')}
                  title={`${row.favorites} favorits`}
                >
                  <Star className="w-3 h-3 fill-amber-400" />
                  {row.favorites}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
