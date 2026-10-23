import React, { useMemo, useState } from 'react';
import { Restaurant } from '../types';
import { cn } from '../utils/cn';
import { isVisited } from '../utils/restaurantFields';
import { Utensils, Award, CheckCircle, TrendingUp, Flame, Star } from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  groupName?: string;
}

interface CuisineRow {
  cuisine: string;
  visits: number;
  favorites: number;
  total: number;
}

type ViewMode = 'visits' | 'total';

const VIEW_LABELS: Record<ViewMode, string> = {
  visits: 'Per visites',
  total: 'Per restaurants',
};

export const CuisineStatsChart: React.FC<Props> = ({ restaurants, groupName }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visits');

  const rows = useMemo(() => {
    const byCuisine = new Map<string, CuisineRow>();
    for (const r of restaurants) {
      const cuisine = r.cuisine?.trim() || 'Altres';
      const row = byCuisine.get(cuisine) ?? { cuisine, visits: 0, favorites: 0, total: 0 };
      row.total += 1;
      // «Visites» suma les visites reals de cada restaurant
      row.visits += r.visits.length;
      if (r.favorite) row.favorites += 1;
      byCuisine.set(cuisine, row);
    }
    return Array.from(byCuisine.values());
  }, [restaurants]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b[viewMode] - a[viewMode] || b.favorites - a.favorites || a.cuisine.localeCompare(b.cuisine, 'ca')),
    [rows, viewMode],
  );

  const topBy = (key: 'visits' | 'favorites') => {
    const top = rows.reduce<CuisineRow | null>((best, row) => (!best || row[key] > best[key] ? row : best), null);
    return top && top[key] > 0 ? top : null;
  };
  const topVisited = topBy('visits');
  const topFavorite = topBy('favorites');
  const totalVisited = restaurants.filter(isVisited).length;
  const maxValue = Math.max(1, ...sortedRows.map((row) => row[viewMode]));

  if (restaurants.length === 0) {
    return (
      <div className="bg-surface p-6 rounded-3xl border border-stone-200/80 text-center py-10">
        <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-stone-800">Encara no hi ha dades de cuina</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
          Afegeix restaurants i registra'n les visites per veure quines cuines us agraden més.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-orange-100 text-accent flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-stone-900">Cuines</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {groupName ? `Les cuines del grup «${groupName}»` : 'Les cuines del teu espai'}
            {viewMode === 'visits' ? ', segons les visites.' : ', segons els restaurants guardats.'}
          </p>
        </div>

        <div className="flex items-center rounded-xl bg-stone-100 p-0.5 text-xs font-semibold" role="group" aria-label="Ordre del gràfic">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={cn(
                'px-3 py-1.5 rounded-lg transition',
                viewMode === mode ? 'bg-surface text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800 mb-1">
            <Flame className="w-4 h-4 text-accent" />
            <span>La més visitada</span>
          </div>
          <div className="text-lg font-black text-stone-900">{topVisited?.cuisine ?? 'Cap encara'}</div>
          <div className="text-xs text-stone-600 mt-0.5">
            {topVisited ? (topVisited.visits === 1 ? '1 visita' : `${topVisited.visits} visites`) : 'Sense visites registrades'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
            <Award className="w-4 h-4 text-amber-600" />
            <span>La més preferida</span>
          </div>
          <div className="text-lg font-black text-stone-900">{topFavorite?.cuisine ?? 'Cap encara'}</div>
          <div className="text-xs text-stone-600 mt-0.5">
            {topFavorite ? (topFavorite.favorites === 1 ? '1 favorit' : `${topFavorite.favorites} favorits`) : 'Sense favorits'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Restaurants visitats</span>
          </div>
          <div className="text-lg font-black text-stone-900 tabular-nums">
            {totalVisited} de {restaurants.length}
          </div>
          <div className="text-xs text-stone-600 mt-0.5">
            {Math.round((totalVisited / restaurants.length) * 100)}% de la col·lecció provada
          </div>
        </div>
      </div>

      <ul className="space-y-2.5" aria-label={`Cuines ${VIEW_LABELS[viewMode].toLowerCase()}`}>
        {sortedRows.map((row) => {
          const value = row[viewMode];
          return (
            <li key={row.cuisine} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-xs">
              <span className="truncate font-semibold text-stone-700" title={row.cuisine}>
                {row.cuisine}
              </span>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-amber-500 transition-[width] duration-500"
                  style={{ width: `${(value / maxValue) * 100}%` }}
                />
              </div>
              <span className="flex items-center gap-2 justify-end tabular-nums">
                <strong className="w-6 text-right text-stone-800">{value}</strong>
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
