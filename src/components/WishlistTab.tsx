import React, { useEffect, useState } from 'react';
import { BookmarkPlus, Dices, Plus, Search, Sparkles, X } from 'lucide-react';
import { WishlistItem } from '../types';
import { matchesQuery } from '../utils/restaurantFields';
import { oneOfKeys, usePersistentState } from '../hooks/usePersistentState';
import { cn } from '../utils/cn';
import { EMPTY_STATE, FIELD } from '../utils/ui';
import { Button } from './Button';
import { CardSkeletons } from './CardSkeletons';
import { SegmentedControl } from './SegmentedControl';
import { WishlistCard } from './WishlistCard';

// «Tots» vol dir tots els que queden per provar: els provats ja són a la llista de restaurants i queden com a arxiu
const WISHLIST_FILTERS = { all: 'Tots', pending: 'Pendents', planned: 'Planificats', visited: 'Provats' } as const;
type WishlistFilter = keyof typeof WISHLIST_FILTERS;

type CardProps = React.ComponentProps<typeof WishlistCard>;

// Temps que la targeta triada amb «Sorprèn-me» queda destacada
const HIGHLIGHT_MS = 4000;

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

  const triedCount = wishlist.filter((w) => w.status === 'visited').length;
  const filterOptions = { ...WISHLIST_FILTERS, visited: triedCount > 0 ? `Provats · ${triedCount}` : WISHLIST_FILTERS.visited };

  const filtered = wishlist.filter(
    (w) =>
      (filter === 'all' ? w.status !== 'visited' : (w.status ?? 'pending') === filter) &&
      matchesQuery(query, [w.restaurantName, w.cuisine, w.address, w.notes, w.recommendedBy]),
  );
  // Tots els desitjats ja s'han provat: no és un problema de filtres
  const allTried = filter === 'all' && query.trim() === '' && filtered.length === 0 && triedCount > 0;
  const hasFilters = query.trim() !== '' || filter !== 'all';

  // «Sorprèn-me»: tria a l'atzar un dels desitjats filtrats que encara no s'han provat i el destaca a la llista
  const [pickedId, setPickedId] = useState<string | null>(null);
  const pickable = filtered.filter((w) => w.status !== 'visited');
  const pickRandom = () => {
    // En tornar a tirar no surt el mateix (si n'hi ha d'altres)
    const candidates = pickable.length > 1 ? pickable.filter((w) => w.id !== pickedId) : pickable;
    if (candidates.length === 0) return;
    setPickedId(candidates[Math.floor(Math.random() * candidates.length)].id);
  };

  useEffect(() => {
    if (!pickedId) return;
    document.getElementById(`wishlist-${pickedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setPickedId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [pickedId]);
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
          <div className="flex items-center gap-2 self-start max-w-full">
            <SegmentedControl
              label="Estat del desitjat"
              options={filterOptions}
              value={filter}
              onChange={setFilter}
              tone="page"
              className="min-w-0"
            />
            <button
              onClick={pickRandom}
              disabled={pickable.length === 0}
              title="Destaca un dels desitjats pendents de la llista a l'atzar"
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface text-stone-700 ring-1 ring-stone-200 font-semibold hover:bg-stone-100 active:scale-[0.96] transition-[background-color,color,transform] disabled:opacity-40"
            >
              <Dices className="w-3.5 h-3.5 text-violet-700" />
              <span>Sorprèn-me</span>
            </button>
          </div>
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
      ) : allTried ? (
        <div className={cn(EMPTY_STATE, 'py-12')}>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Ja els heu provat tots!</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            Els provats són a la llista de restaurants. Afegiu-ne un de nou quan us en recomanin un.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onAdd} variant="wish">
              <Plus className="w-4 h-4" /> Proposar desitjat
            </Button>
            <Button onClick={() => setFilter('visited')} variant="secondary">
              Veure els provats
            </Button>
          </div>
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
            <WishlistCard key={item.id} item={item} highlighted={item.id === pickedId} {...cardHandlers} />
          ))}
        </div>
      )}
    </div>
  );
};
