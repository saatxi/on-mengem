import React from 'react';
import { Utensils, BookmarkPlus, Users, BarChart3, Bell } from 'lucide-react';
import { cn } from '../utils/cn';

type TabType = 'restaurants' | 'wishlist' | 'group' | 'stats' | 'alerts';

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isPersonal: boolean;
  alertCount: number;
}

const ALL_TABS: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'restaurants', label: 'Restaurants', icon: Utensils },
  { id: 'wishlist', label: 'Desitjats', icon: BookmarkPlus },
  { id: 'group', label: 'Grup', icon: Users },
  { id: 'stats', label: 'Resum', icon: BarChart3 },
  { id: 'alerts', label: 'Activitat', icon: Bell },
];

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange, isPersonal, alertCount }) => {
  const tabs = ALL_TABS.filter((t) => {
    if (t.id === 'group' || t.id === 'alerts') return !isPersonal;
    return true;
  });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex sm:hidden bg-surface/85 backdrop-blur-xl border-t border-stone-900/5 h-(--bottom-nav-h) pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-transform active:scale-[0.94]"
          >
            <div className={cn('relative flex items-center justify-center w-14 h-8 rounded-full transition-colors', isActive && 'bg-accent-soft')}>
              <Icon className={cn('size-5', isActive ? 'text-accent' : 'text-stone-500')} />
              {id === 'alerts' && alertCount > 0 && (
                <span className="absolute top-0 right-2.5 min-w-[1rem] h-4 rounded-full bg-brand text-white text-[9px] font-bold ring-2 ring-surface flex items-center justify-center px-0.5">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            <span className={cn('text-[11px]', isActive ? 'font-bold text-accent' : 'font-medium text-stone-500')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
