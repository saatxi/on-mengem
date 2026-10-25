import React, { useMemo } from 'react';
import { CalendarDays, Clock, Flame } from 'lucide-react';
import { Restaurant } from '../types';
import { daysSinceLastVisit, monthStreak, visitsByMonth } from '../utils/stats';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  restaurants: Restaurant[];
}

const monthLabel = (month: string) => new Date(`${month}-01T00:00`).toLocaleDateString('ca', { month: 'short' }).replace('.', '');

const lastVisitText = (days: number | null) => {
  if (days === null) return 'Encara cap';
  if (days === 0) return 'Avui';
  if (days === 1) return 'Ahir';
  return `Fa ${days} dies`;
};

export const ActivityChart: React.FC<Props> = ({ restaurants }) => {
  const months = useMemo(() => visitsByMonth(restaurants), [restaurants]);
  const days = useMemo(() => daysSinceLastVisit(restaurants), [restaurants]);
  const streak = useMemo(() => monthStreak(restaurants), [restaurants]);
  const total = months.reduce((sum, m) => sum + m.count, 0);
  const max = Math.max(1, ...months.map((m) => m.count));

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-5')}>
      <div className="pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="size-9 rounded-2xl bg-accent-soft text-accent flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Activitat</h3>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">{total === 1 ? '1 visita' : `${total} visites`} els darrers 12 mesos.</p>
      </div>

      <div className="grid grid-cols-12 items-end gap-1.5 h-36" role="list" aria-label="Visites per mes">
        {months.map(({ month, count }) => (
          <div
            key={month}
            role="listitem"
            className="flex h-full flex-col items-center justify-end gap-1"
            title={`${monthLabel(month)}: ${count}`}
          >
            <span className={cn('text-[0.65rem] font-bold tabular-nums text-stone-600', count === 0 && 'invisible')}>{count}</span>
            <div className="flex w-full min-h-0 flex-1 items-end justify-center">
              <div
                className={cn(
                  'w-full max-w-5 rounded-t-lg rounded-b-sm transition-[height] duration-500',
                  count > 0 ? 'bg-brand' : 'bg-stone-100',
                )}
                style={{ height: count > 0 ? `${(count / max) * 100}%` : '0.375rem' }}
              />
            </div>
            <span className="text-[0.65rem] font-medium text-stone-500">{monthLabel(month)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-accent-soft">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800 mb-1">
            <Clock className="w-4 h-4 text-accent" />
            <span>Última sortida</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-stone-900 tabular-nums">{lastVisitText(days)}</div>
        </div>
        <div className="p-4 rounded-3xl bg-amber-50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
            <Flame className="w-4 h-4 text-amber-600" />
            <span>Ratxa</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-stone-900 tabular-nums">
            {streak === 1 ? '1 mes' : `${streak} mesos`}
          </div>
          <div className="text-xs text-stone-600 mt-0.5">seguits amb alguna visita</div>
        </div>
      </div>
    </div>
  );
};
