import React, { useMemo } from 'react';
import { MapPin, Star } from 'lucide-react';
import { Restaurant } from '../types';
import { areaRows } from '../utils/stats';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  restaurants: Restaurant[];
}

/** Zones que es mostren; la resta no hi caben i són les menys visitades. */
const MAX_ROWS = 8;

// Zones (districte o barri, o la població) amb més visites, amb els restaurants i la nota mitjana de cadascuna
export const AreaStatsCard: React.FC<Props> = ({ restaurants }) => {
  const rows = useMemo(() => areaRows(restaurants), [restaurants]);
  if (rows.length === 0) return null;

  const shown = rows.slice(0, MAX_ROWS);
  const maxVisits = Math.max(1, ...shown.map((row) => row.visits));
  const withArea = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-5')}>
      <div className="pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="size-9 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Zones</h3>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          Visites de cada zona, de {withArea === 1 ? '1 restaurant' : `${withArea} restaurants`} amb zona, i la nota mitjana.
          {rows.length > MAX_ROWS && ` Les ${MAX_ROWS} amb més visites.`}
        </p>
      </div>

      <ul className="space-y-2.5" aria-label="Visites per zona">
        {shown.map((row) => (
          <li key={row.area} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-xs">
            <span className="font-semibold text-stone-700 truncate" title={row.area}>
              {row.area}
            </span>
            <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${(row.visits / maxVisits) * 100}%` }}
              />
            </div>
            <span className="flex items-center gap-2 justify-end tabular-nums">
              <strong className="w-6 text-right text-stone-800" title="Visites">
                {row.visits}
              </strong>
              <span className={cn('flex items-center gap-0.5 w-9 text-amber-600', row.rating == null && 'invisible')} title="Nota mitjana">
                <Star className="w-3 h-3 fill-amber-400" />
                {row.rating?.toFixed(1)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
