import React, { useState } from 'react';
import { BookmarkPlus, Plus, Search, Sparkles, X } from 'lucide-react';
import { WishlistItem } from '../types';
import { matchesQuery } from '../utils/restaurantFields';
import { oneOfKeys, usePersistentState } from '../hooks/usePersistentState';
import { cn } from '../utils/cn';
import { EMPTY_STATE, FIELD } from '../utils/ui';
import { Button } from './Button';
import { CardSkeletons } from './CardSkeletons';
import { SegmentedControl } from './SegmentedControl';
import { WishlistCard } from './WishlistCard';

const WISHLIST_FILTERS = { all: 'Tots', pending: 'Pendents', planned: 'Planificats', visited: 'Provats' } as const;
type WishlistFilter = keyof typeof WISHLIST_FILTERS;

type CardProps = React.ComponentProps<typeof WishlistCard>;

interface Props {
  /** Desitjats visibles (sense els que s'acaben d'eliminar i encara es poden recuperar). */
  wishlist: WishlistItem[];
  loading: boolean;
  isPersonal: boolean;
  onAdd: () => void;
  onCopy: CardProps['onCopy'];
  onMove?: CardProps['onMove'];
  onEdit: CardProps['onEdit'];
  onDelete: CardProps['onDelete'];
  onTogglePlanned: CardProps['onTogglePlanned'];
  onMarkVisited: CardProps['onMarkVisited'];
}

export const WishlistTab: React.FC<Props> = ({ wishlist, loading, isPersonal, onAdd, ...cardHandlers }) => {
  // La cerca no es recorda; el filtre d'estat, sí
  const [query, setQuery] = useState('');
  const [filter, setFilter] = usePersistentState<WishlistFilter>('filter-wishlist', 'all', oneOfKeys(WISHLIST_FILTERS));

  const filtered = wishlist.filter(
    (w) =>
      (filter === 'all' || (w.status ?? 'pending') === filter) &&
      matchesQuery(query, [w.restaurantName, w.cuisine, w.address, w.notes, w.recommendedBy]),
  );
  const hasFilters = query.trim() !== '' || filter !== 'all';
  const clearFilters = () => {
    setQuery('');
    setFilter('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 flex items-center gap-2.5">
            <span className="size-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <BookmarkPlus className="w-5 h-5" />
            </span>
            Llista de desitjats
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {isPersonal
              ? 'Llocs que vols provar, només visibles per a tu.'
              : 'Restaurants pendents que algú del grup ha recomanat o vol anar a provar.'}
          </p>
        </div>

        <Button onClick={onAdd} variant="wish" className="hidden sm:inline-flex">
          <Plus className="w-4 h-4" />
          <span>Proposar desitjat</span>
        </Button>
      </div>

      {wishlist.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cercar per nom, cuina, qui ho recomana..."
              aria-label="Cercar desitjats"
              className={cn(FIELD, 'pl-11')}
            />
          </div>
          <SegmentedControl label="Estat del desitjat" options={WISHLIST_FILTERS} value={filter} onChange={setFilter} tone="page" className="self-start" />
        </div>
      )}

      {loading ? (
        <CardSkeletons count={4} className="grid grid-cols-1 md:grid-cols-2 gap-4" />
      ) : wishlist.length === 0 ? (
        <div className={EMPTY_STATE}>
          <div className="w-16 h-16 rounded-3xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center mx-auto -rotate-6">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">No hi ha llocs desitjats pendents</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            T'han recomanat un restaurant interessant? Afegeix-lo aquí perquè el grup el pugui provar!
          </p>
          <Button onClick={onAdd} variant="wish">
            <Plus className="w-4 h-4" /> Afegir el primer desitjat
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(EMPTY_STATE, 'py-12')}>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Cap desitjat amb aquests filtres</h3>
          {hasFilters && (
            <Button onClick={clearFilters} variant="secondary">
              <X className="w-4 h-4" /> Netejar filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {filtered.map((item) => (
            <WishlistCard key={item.id} item={item} {...cardHandlers} />
          ))}
        </div>
      )}
    </div>
  );
};
