import React from 'react';
import { UtensilsCrossed, CheckCircle2, Star, Heart, type LucideIcon } from 'lucide-react';
import { Restaurant, WishlistItem } from '../types';
import { isVisited, shownRating } from '../utils/restaurantFields';
import { isInCurrentMonth } from '../utils/time';
import { useCountUp } from '../hooks/useCountUp';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  restaurants: Restaurant[];
  wishlist: WishlistItem[];
}

export const StatTiles: React.FC<Props> = ({ restaurants, wishlist }) => {
  const visitedCount = restaurants.filter(isVisited).length;
  // Mateixa nota que es mostra a les targetes i a l'ordre «Millor valorats»
  const ratings = restaurants.map(shownRating).filter((rating): rating is number => rating != null && rating > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

  // Novetats del mes en curs
  const addedThisMonth = restaurants.filter((r) => isInCurrentMonth(r.createdAt)).length;
  const visitedThisMonth = restaurants.filter((r) => r.visits.some((v) => isInCurrentMonth(v.visitedOn))).length;
  const wishedThisMonth = wishlist.filter((w) => isInCurrentMonth(w.createdAt)).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile label="Restaurants" value={restaurants.length} trend={addedThisMonth} icon={UtensilsCrossed} iconClassName="bg-accent-soft text-accent" />
      <StatTile label="Visitats" value={visitedCount} trend={visitedThisMonth} icon={CheckCircle2} iconClassName="bg-emerald-100 text-emerald-600" />
      <StatTile label="Nota mitjana" value={avgRating} decimals={1} icon={Star} iconClassName="bg-amber-100 text-amber-500" />
      <StatTile label="Desitjats" value={wishlist.length} trend={wishedThisMonth} icon={Heart} iconClassName="bg-violet-100 text-violet-700" />
    </div>
  );
};

interface TileProps {
  label: string;
  /** null = sense dades (es mostra «—»). */
  value: number | null;
  decimals?: number;
  /** Quants n'hi ha de nous aquest mes; no es mostra si és 0 o no s'indica. */
  trend?: number;
  icon: LucideIcon;
  iconClassName: string;
}

const StatTile: React.FC<TileProps> = ({ label, value, decimals = 0, trend, icon: Icon, iconClassName }) => {
  const shown = useCountUp(value ?? 0);

  return (
    <div className={cn(CARD, 'p-4 sm:p-5 flex items-center gap-3')}>
      <div className={cn('size-12 rounded-2xl flex items-center justify-center flex-shrink-0', iconClassName)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-extrabold tracking-tight tabular-nums text-stone-900 leading-none">
          {value === null ? '—' : shown.toFixed(decimals)}
        </p>
        <p className="text-sm font-medium text-stone-500 mt-1">{label}</p>
        {!!trend && <p className="text-xs font-bold text-emerald-700 mt-0.5">+{trend} aquest mes</p>}
      </div>
    </div>
  );
};
