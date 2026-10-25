import React, { useMemo } from 'react';
import { BadgeEuro, Star, ThumbsUp } from 'lucide-react';
import { Restaurant } from '../types';
import { priceBreakdown } from '../utils/stats';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  restaurants: Restaurant[];
}

export const PriceStatsCard: React.FC<Props> = ({ restaurants }) => {
  const { rows, bestValue } = useMemo(() => priceBreakdown(restaurants), [restaurants]);
  const withPrice = rows.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  if (withPrice === 0) return null;

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-5')}>
      <div className="pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="size-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <BadgeEuro className="w-4 h-4" />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Preu i valoració</h3>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {withPrice === 1 ? '1 restaurant' : `${withPrice} restaurants`} amb preu, i la nota mitjana de cada franja.
        </p>
      </div>

      {bestValue && (
        <div className="p-4 rounded-3xl bg-emerald-50 flex items-center gap-3">
          <ThumbsUp className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-emerald-900">Millor qualitat-preu</div>
            <div className="text-lg font-extrabold tracking-tight text-stone-900">{bestValue}</div>
            <div className="text-xs text-stone-600">La franja més barata amb una nota igual o més alta que la mitjana.</div>
          </div>
        </div>
      )}

      <ul className="space-y-2.5" aria-label="Restaurants per franja de preu">
        {rows.map((row) => (
          <li key={row.range} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
            <span className="font-semibold text-stone-700 whitespace-nowrap">{row.range}</span>
            <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${(row.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="flex items-center gap-2 justify-end tabular-nums">
              <strong className="w-6 text-right text-stone-800">{row.count}</strong>
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
