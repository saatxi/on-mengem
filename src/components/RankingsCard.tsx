import React, { useMemo, useState } from 'react';
import { ChevronRight, Repeat, Star, Trophy, Undo2 } from 'lucide-react';
import { Restaurant } from '../types';
import { forgotten, mostRepeated, topRated, type RankedRestaurant } from '../utils/stats';
import { cuisineStyle } from '../utils/restaurantFields';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  /** Restaurants del període triat (millor valorats i més repetits). */
  restaurants: Restaurant[];
  /** Tots els restaurants: «Per tornar-hi» mira la darrera visita de sempre. */
  allRestaurants: Restaurant[];
  onSelect: (restaurantId: string) => void;
}

type RankingMode = 'rated' | 'repeated' | 'forgotten';

const MODE_LABELS: Record<RankingMode, string> = {
  rated: 'Millor valorats',
  repeated: 'Més repetits',
  forgotten: 'Per tornar-hi',
};

const EMPTY_TEXTS: Record<RankingMode, string> = {
  rated: 'Encara no hi ha restaurants valorats.',
  repeated: 'Cap restaurant té més d\'una visita encara.',
  forgotten: 'Cap restaurant de 4 estrelles o més fa més de 6 mesos que no es visita.',
};

const valueText = (mode: RankingMode, value: number) => {
  if (mode === 'rated') return value.toFixed(1);
  if (mode === 'repeated') return `${value} cops`;
  return value >= 60 ? `fa ${Math.round(value / 30)} mesos` : `fa ${value} dies`;
};

export const RankingsCard: React.FC<Props> = ({ restaurants, allRestaurants, onSelect }) => {
  const [mode, setMode] = useState<RankingMode>('rated');

  const ranked: RankedRestaurant[] = useMemo(() => {
    if (mode === 'rated') return topRated(restaurants);
    if (mode === 'repeated') return mostRepeated(restaurants);
    return forgotten(allRestaurants);
  }, [mode, restaurants, allRestaurants]);

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-5')}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Rànquings</h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {mode === 'forgotten' ? 'Ben valorats que fa temps que no visiteu.' : 'Els cinc primers del període.'}
          </p>
        </div>

        <div className="flex items-center max-w-full overflow-x-auto rounded-full bg-stone-100 p-1 text-xs font-semibold" role="group" aria-label="Rànquing">
          {(Object.keys(MODE_LABELS) as RankingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full transition-[background-color,color,box-shadow]',
                mode === m ? 'bg-surface text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">{EMPTY_TEXTS[mode]}</p>
      ) : (
        <ol className="space-y-1" aria-label={MODE_LABELS[mode]}>
          {ranked.map(({ restaurant, value }, index) => (
            <li key={restaurant.id}>
              <button
                onClick={() => onSelect(restaurant.id)}
                className="w-full flex items-center gap-3 p-2 -mx-2 rounded-2xl text-left hover:bg-stone-50 active:scale-[0.99] transition-[background-color,transform]"
              >
                <span className="w-5 text-center text-sm font-extrabold tabular-nums text-stone-400">{index + 1}</span>
                <span className="size-10 shrink-0 rounded-2xl bg-stone-100 flex items-center justify-center text-lg" aria-hidden="true">
                  {cuisineStyle(restaurant.cuisine).emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-stone-900">{restaurant.name}</span>
                  {restaurant.cuisine && <span className="block truncate text-xs text-stone-500">{restaurant.cuisine}</span>}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-stone-700 whitespace-nowrap">
                  {mode === 'rated' && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                  {mode === 'repeated' && <Repeat className="w-3.5 h-3.5 text-stone-400" />}
                  {mode === 'forgotten' && <Undo2 className="w-3.5 h-3.5 text-stone-400" />}
                  {valueText(mode, value)}
                </span>
                <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
