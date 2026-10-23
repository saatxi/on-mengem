import React from 'react';
import { Utensils, BookmarkPlus, Users, BarChart3, Bell } from 'lucide-react';

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
  { id: 'stats', label: 'Gràfic', icon: BarChart3 },
  { id: 'alerts', label: 'Activitat', icon: Bell },
];

export const BottomNav: React.FC<Props> = ({ activeTab, onTabChange, isPersonal, alertCount }) => {
  const tabs = ALL_TABS.filter((t) => {
    if (t.id === 'group' || t.id === 'alerts') return !isPersonal;
    return true;
  });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex sm:hidden bg-surface/95 backdrop-blur-md border-t border-stone-200 h-(--bottom-nav-h) pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition active:scale-95"
          >
            <div className="relative">
              <Icon className={`size-5 ${isActive ? 'text-accent' : 'text-stone-400'}`} />
              {id === 'alerts' && alertCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center px-0.5">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'text-accent' : 'text-stone-400'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
