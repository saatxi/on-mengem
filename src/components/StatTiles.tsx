import React from 'react';
import { UtensilsCrossed, CheckCircle2, Star, Heart } from 'lucide-react';
import { Restaurant } from '../types';
import { isVisited } from '../utils/restaurantFields';

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
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
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
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div
          key={label}
          className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex items-center gap-3"
        >
          <div className={`size-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-black text-stone-900 leading-none">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
