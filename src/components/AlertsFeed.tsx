import React from 'react';
import { Bell, UtensilsCrossed, Sparkles, Users, Star } from 'lucide-react';
import { Alert } from '../types';

interface Props {
  alerts: Alert[];
  markAllAlertsAsRead: () => void;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ara mateix';
  if (min < 60) return `fa ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `fa ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ahir';
  return `fa ${d} dies`;
}

type AlertConfig = {
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const ALERT_CONFIG: Record<Alert['type'], AlertConfig> = {
  restaurant_added: { icon: UtensilsCrossed, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  wishlist_added: { icon: Sparkles, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  group_joined: { icon: Users, iconBg: 'bg-stone-100', iconColor: 'text-stone-600' },
  restaurant_reviewed: { icon: Star, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
};

export const AlertsFeed: React.FC<Props> = ({ alerts, markAllAlertsAsRead }) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Activitat i Alertes del Grup en Temps Real
          </h2>
          <p className="text-xs text-stone-500">
            Notificacions instantànies dels canvis compartits al grup.
          </p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={markAllAlertsAsRead}
            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Marcar tot com a llegit
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="py-12 text-center text-xs text-stone-400">
          Cap moviment recent al grup. Afegeix un restaurant o proposa un desitjat per generar alertes!
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.restaurant_added;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start gap-3 hover:bg-orange-50/40 transition"
              >
                <div
                  className={`size-9 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`size-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-stone-900">{alert.title}</h4>
                    <span className="text-[11px] text-stone-400 whitespace-nowrap flex-shrink-0">
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
