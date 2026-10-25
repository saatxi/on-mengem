import React, { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Restaurant, WishlistItem } from '../types';
import { filterByPeriod, yearsWithVisits, type StatsPeriod } from '../utils/stats';
import { oneOfKeys, usePersistentState } from '../hooks/usePersistentState';
import { ActivityChart } from './ActivityChart';
import { CuisineStatsChart } from './CuisineStatsChart';
import { PriceStatsCard } from './PriceStatsCard';
import { RankingsCard } from './RankingsCard';
import { SegmentedControl } from './SegmentedControl';
import { StatTiles } from './StatTiles';
import { YearInNumbers } from './YearInNumbers';

const STATS_PERIODS: Record<StatsPeriod, string> = { year: 'Aquest any', all: 'Sempre' };

interface Props {
  restaurants: Restaurant[];
  wishlist: WishlistItem[];
  /** Nom del grup; buit a l'espai personal. */
  groupName?: string;
  onSelectRestaurant: (restaurantId: string) => void;
  onNotice: (message: string) => void;
}

export const StatsTab: React.FC<Props> = ({ restaurants, wishlist, groupName, onSelectRestaurant, onNotice }) => {
  const [period, setPeriod] = usePersistentState<StatsPeriod>('stats-period', 'all', oneOfKeys(STATS_PERIODS));
  const [showYearInNumbers, setShowYearInNumbers] = useState(false);

  const periodRestaurants = filterByPeriod(restaurants, period);
  const latestVisitYear = yearsWithVisits(restaurants)[0];

  return (
    <div className="space-y-6">
      <StatTiles restaurants={restaurants} wishlist={wishlist} />
      {latestVisitYear !== undefined && (
        <button
          onClick={() => setShowYearInNumbers(true)}
          className="w-full flex items-center gap-4 p-5 rounded-3xl bg-brand text-white text-left shadow-card hover:shadow-card-hover active:scale-[0.99] transition-[box-shadow,transform]"
        >
          <span className="size-12 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold tracking-tight">El {latestVisitYear} en xifres</span>
            <span className="block text-sm opacity-90">L'any resumit, a punt per compartir</span>
          </span>
          <ChevronRight className="size-5 shrink-0 opacity-80" />
        </button>
      )}
      <ActivityChart restaurants={restaurants} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-stone-600">Rànquings i preferències</h2>
        <SegmentedControl label="Període" options={STATS_PERIODS} value={period} onChange={setPeriod} tone="page" />
      </div>
      <RankingsCard restaurants={periodRestaurants} allRestaurants={restaurants} onSelect={onSelectRestaurant} />
      <CuisineStatsChart restaurants={periodRestaurants} groupName={groupName} collectionSize={restaurants.length} />
      <PriceStatsCard restaurants={periodRestaurants} />

      {showYearInNumbers && (
        <YearInNumbers
          restaurants={restaurants}
          wishlist={wishlist}
          spaceName={groupName}
          onClose={() => setShowYearInNumbers(false)}
          onNotice={onNotice}
        />
      )}
    </div>
  );
};
