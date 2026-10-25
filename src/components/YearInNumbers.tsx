import React, { useMemo, useState } from 'react';
import { CalendarHeart, Share2 } from 'lucide-react';
import { Restaurant, WishlistItem } from '../types';
import { monthName, plural, yearSummary, yearSummaryText, yearsWithVisits } from '../utils/stats';
import { useCountUp } from '../hooks/useCountUp';
import { cn } from '../utils/cn';
import { Modal, ModalHeader } from './Modal';
import { Button } from './Button';

interface Props {
  restaurants: Restaurant[];
  wishlist: WishlistItem[];
  /** Nom del grup; buit a l'espai personal. */
  spaceName?: string;
  onClose: () => void;
  onNotice: (message: string) => void;
}

export const YearInNumbers: React.FC<Props> = ({ restaurants, wishlist, spaceName, onClose, onNotice }) => {
  const years = useMemo(() => yearsWithVisits(restaurants), [restaurants]);
  const [year, setYear] = useState(() => years[0] ?? new Date().getFullYear());
  const summary = useMemo(() => yearSummary(restaurants, wishlist, year), [restaurants, wishlist, year]);

  const share = async () => {
    const text = yearSummaryText(summary, spaceName);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // L'usuari ha tancat el diàleg de compartir
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onNotice("S'ha copiat el resum");
    } catch {
      onNotice("No s'ha pogut copiar el resum");
    }
  };

  return (
    <Modal label={`El ${year} en xifres`} onClose={onClose} size="lg">
      <ModalHeader title={`El ${year} en xifres`} subtitle={spaceName ? `Grup «${spaceName}»` : 'El teu espai'} icon={CalendarHeart} onClose={onClose} />

      <div className="p-5 sm:p-6 space-y-4">
        {years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Any">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                aria-pressed={year === y}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold tabular-nums transition-[background-color,color]',
                  year === y ? 'bg-inverse text-on-inverse' : 'bg-stone-100 text-stone-600 hover:text-stone-900',
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-3xl bg-brand p-6 text-white">
          <p className="text-sm font-semibold opacity-90">Visites</p>
          <BigNumber value={summary.visits} className="text-6xl" />
          <p className="text-sm font-medium opacity-90 mt-1">
            a {summary.restaurants === 1 ? '1 restaurant' : `${summary.restaurants} restaurants`}, {summary.newRestaurants === 1 ? '1 de nou' : `${summary.newRestaurants} de nous`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Fact label="Cuina preferida" value={summary.topCuisine?.cuisine} detail={summary.topCuisine && plural(summary.topCuisine.visits, 'visita', 'visites')} className="bg-accent-soft" />
          <Fact
            label="Mes més actiu"
            value={summary.busiestMonth && capitalize(monthName(summary.busiestMonth.month))}
            detail={summary.busiestMonth && plural(summary.busiestMonth.visits, 'visita', 'visites')}
            className="bg-emerald-50"
          />
          <Fact label="Millor nota" value={summary.bestRated?.name} detail={summary.bestRated && `${summary.bestRated.rating.toFixed(1)} ★`} className="bg-amber-50" />
          <Fact label="Més repetit" value={summary.mostRepeated?.name} detail={summary.mostRepeated && `${summary.mostRepeated.visits} cops`} className="bg-stone-100" />
        </div>

        {summary.wishesFulfilled > 0 && (
          <div className="rounded-3xl bg-violet-50 p-4 flex items-baseline gap-2">
            <BigNumber value={summary.wishesFulfilled} className="text-3xl text-violet-700" />
            <span className="text-sm font-semibold text-stone-700">{summary.wishesFulfilled === 1 ? 'desitjat complert' : 'desitjats complerts'}</span>
          </div>
        )}

        <Button variant="brand" size="lg" onClick={share} className="w-full">
          <Share2 className="w-4 h-4" />
          Compartir
        </Button>
      </div>
    </Modal>
  );
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const BigNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const shown = useCountUp(value);
  return <span className={cn('block font-extrabold tracking-tight tabular-nums leading-none', className)}>{Math.round(shown)}</span>;
};

interface FactProps {
  label: string;
  value?: string | null;
  detail?: string | null;
  className: string;
}

const Fact: React.FC<FactProps> = ({ label, value, detail, className }) => (
  <div className={cn('p-4 rounded-3xl min-w-0', className)}>
    <div className="text-xs font-semibold text-stone-600 mb-1">{label}</div>
    <div className="text-lg font-extrabold tracking-tight text-stone-900 truncate" title={value ?? undefined}>
      {value ?? '—'}
    </div>
    {detail && <div className="text-xs text-stone-600 mt-0.5">{detail}</div>}
  </div>
);
