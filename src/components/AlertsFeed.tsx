import React from 'react';
import { Bell, UtensilsCrossed, Sparkles, Users, Star, UserMinus, Crown } from 'lucide-react';
import { Alert } from '../types';
import { timeAgo } from '../utils/time';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  alerts: Alert[];
  markAllAlertsAsRead: () => void;
}

type AlertConfig = {
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const ALERT_CONFIG: Record<Alert['type'], AlertConfig> = {
  restaurant_added: { icon: UtensilsCrossed, iconBg: 'bg-accent-soft', iconColor: 'text-accent' },
  wishlist_added: { icon: Sparkles, iconBg: 'bg-violet-100', iconColor: 'text-violet-700' },
  group_joined: { icon: Users, iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
  restaurant_reviewed: { icon: Star, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  group_left: { icon: UserMinus, iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
  owner_changed: { icon: Crown, iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
};

export const AlertsFeed: React.FC<Props> = ({ alerts, markAllAlertsAsRead }) => {
  return (
    <div className={cn(CARD, 'p-5 sm:p-7 space-y-4')}>
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Activitat del grup
          </h2>
          <p className="text-xs text-stone-500">
            Els darrers canvis que ha fet la gent del grup.
          </p>
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
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.restaurant_added;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-stone-50 flex items-start gap-3 hover:bg-accent-soft/50 transition-colors"
              >
                <div
                  className={`size-9 rounded-2xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`size-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-stone-900">{alert.title}</h4>
                    <span className="text-xs text-stone-500 whitespace-nowrap flex-shrink-0">
                      {timeAgo(alert.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
