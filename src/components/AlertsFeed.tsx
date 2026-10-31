import React, { useMemo } from 'react';
import { Bell, UtensilsCrossed, Sparkles, Users, Star, UserMinus, Crown, ChevronRight } from 'lucide-react';
import { Alert, Restaurant } from '../types';
import { dayBucket, timeAgo } from '../utils/time';
import { oneOfKeys, usePersistentState } from '../hooks/usePersistentState';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { SegmentedControl } from './SegmentedControl';

interface Props {
  alerts: Alert[];
  /** Restaurants de l'espai actiu: només s'obren els avisos d'un restaurant que encara existeix. */
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurantId: string) => void;
  markAllAlertsAsRead: () => void;
}

const ALERT_FILTERS = { all: 'Tot', restaurants: 'Restaurants', visits: 'Visites', wishlist: 'Desitjats', group: 'Grup' } as const;
type AlertFilter = keyof typeof ALERT_FILTERS;

type AlertConfig = {
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  filter: Exclude<AlertFilter, 'all'>;
};

const ALERT_CONFIG: Record<Alert['type'], AlertConfig> = {
  restaurant_added: { icon: UtensilsCrossed, iconBg: 'bg-accent-soft', iconColor: 'text-accent', filter: 'restaurants' },
  wishlist_added: { icon: Sparkles, iconBg: 'bg-violet-100', iconColor: 'text-violet-700', filter: 'wishlist' },
  group_joined: { icon: Users, iconBg: 'bg-sky-100', iconColor: 'text-sky-700', filter: 'group' },
  restaurant_reviewed: { icon: Star, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', filter: 'visits' },
  group_left: { icon: UserMinus, iconBg: 'bg-red-50', iconColor: 'text-red-700', filter: 'group' },
  owner_changed: { icon: Crown, iconBg: 'bg-amber-100', iconColor: 'text-amber-800', filter: 'group' },
};

const configFor = (alert: Alert) => ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.restaurant_added;

export const AlertsFeed: React.FC<Props> = ({ alerts, restaurants, onSelectRestaurant, markAllAlertsAsRead }) => {
  const [filter, setFilter] = usePersistentState<AlertFilter>('filter-alerts', 'all', oneOfKeys(ALERT_FILTERS));

  const restaurantIds = useMemo(() => new Set(restaurants.map((r) => r.id)), [restaurants]);

  // Avisos filtrats agrupats per blocs temporals; ja arriben ordenats del més recent al més antic
  const sections = useMemo(() => {
    const result: { label: string; alerts: Alert[] }[] = [];
    for (const alert of alerts) {
      if (filter !== 'all' && configFor(alert).filter !== filter) continue;
      const label = alert.createdAt ? dayBucket(alert.createdAt) : 'Sense data';
      const last = result[result.length - 1];
      if (last?.label === label) last.alerts.push(alert);
      else result.push({ label, alerts: [alert] });
    }
    return result;
  }, [alerts, filter]);

  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-4')}>
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Activitat del grup
          </h2>
          <p className="text-xs text-stone-500">Els darrers canvis que ha fet la gent del grup.</p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={markAllAlertsAsRead}
            className="px-3 py-1.5 rounded-full ring-1 ring-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Marcar tot com a llegit
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-500">
          Encara no hi ha activitat. Quan algú afegeixi un restaurant o un desitjat, ho veuràs aquí.
        </div>
      ) : (
        <>
          <SegmentedControl label="Tipus d'activitat" options={ALERT_FILTERS} value={filter} onChange={setFilter} />
          {sections.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">No hi ha activitat d'aquest tipus.</div>
          ) : (
            sections.map((section) => (
              <section key={section.label} className="space-y-2">
                <h3 className="text-xs font-bold text-stone-500 pt-1">{section.label}</h3>
                <div className="space-y-3">
                  {section.alerts.map((alert) => {
                    const { restaurantId } = alert;
                    const canOpen = restaurantId !== undefined && restaurantIds.has(restaurantId);
                    return <AlertRow key={alert.id} alert={alert} onOpen={canOpen ? () => onSelectRestaurant(restaurantId) : undefined} />;
                  })}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
};

interface RowProps {
  alert: Alert;
  /** Si s'indica, l'avís es pot tocar per obrir el restaurant. */
  onOpen?: () => void;
}

const AlertRow: React.FC<RowProps> = ({ alert, onOpen }) => {
  const config = configFor(alert);
  const Icon = config.icon;
  const content = (
    <>
      <div className={`size-9 rounded-2xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`size-4 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h4 className="text-sm font-bold text-stone-900">{alert.title}</h4>
          <span className="text-xs text-stone-500 whitespace-nowrap flex-shrink-0">{timeAgo(alert.createdAt)}</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">{alert.message}</p>
      </div>
      {onOpen && <ChevronRight className="size-4 text-stone-400 self-center flex-shrink-0" />}
    </>
  );
  const className = 'w-full p-4 rounded-2xl bg-stone-50 flex items-start gap-3 text-left hover:bg-accent-soft/50 transition-colors';
  return onOpen ? (
    <button type="button" onClick={onOpen} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
};
