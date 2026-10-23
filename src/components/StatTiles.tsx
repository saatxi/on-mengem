import React from 'react';
import { UtensilsCrossed, CheckCircle2, Star, Heart } from 'lucide-react';
import { Restaurant } from '../types';
import { isVisited } from '../utils/restaurantFields';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  restaurants: Restaurant[];
  wishlistCount: number;
}

export const StatTiles: React.FC<Props> = ({ restaurants, wishlistCount }) => {
  const visitedCount = restaurants.filter(isVisited).length;
  const ratedRestaurants = restaurants.filter((r) => r.rating != null && r.rating > 0);
  const avgRating =
    ratedRestaurants.length > 0
      ? ratedRestaurants.reduce((sum, r) => sum + r.rating!, 0) / ratedRestaurants.length
      : null;

  const tiles = [
    {
      label: 'Restaurants',
      value: restaurants.length,
      icon: UtensilsCrossed,
      iconBg: 'bg-accent-soft',
      iconColor: 'text-accent',
    },
    {
      label: 'Visitats',
      value: visitedCount,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Nota mitjana',
      value: avgRating !== null ? avgRating.toFixed(1) : '—',
      icon: Star,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Desitjats',
      value: wishlistCount,
      icon: Heart,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-700',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div
          key={label}
          className={cn(CARD, 'p-4 sm:p-5 flex items-center gap-3')}
        >
          <div className={cn('size-12 rounded-2xl flex items-center justify-center flex-shrink-0', iconBg)}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-3xl font-extrabold tracking-tight tabular-nums text-stone-900 leading-none">{value}</p>
            <p className="text-sm font-medium text-stone-500 mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
