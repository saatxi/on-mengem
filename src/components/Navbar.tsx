import React, { useEffect, useRef, useState } from 'react';
import {
  Utensils,
  ChevronDown,
  Plus,
  UserPlus,
  Bell,
  Check,
  Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Alert } from '../types';
import { timeAgo } from '../utils/time';

interface Props {
  alerts: Alert[];
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
  onOpenProfile: () => void;
  onMarkAlertRead: (alertId: string) => void;
  onMarkAllAlertsRead: () => void;
}

export const Navbar: React.FC<Props> = ({
  alerts,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenProfile,
  onMarkAlertRead,
  onMarkAllAlertsRead,
}) => {
  const { userProfile, activeGroup, userGroups, setActiveGroupId, authUser } = useAuth();
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const menusRef = useRef<HTMLDivElement>(null);

  // Els desplegables es tanquen en clicar fora o amb Escape
  useEffect(() => {
    if (!showGroupMenu && !showAlertMenu) return;
    const closeMenus = () => {
      setShowGroupMenu(false);
      setShowAlertMenu(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !menusRef.current?.contains(e.target)) closeMenus();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showGroupMenu, showAlertMenu]);

  const unreadAlerts = alerts.filter(
    (a) => !authUser || !a.readBy?.includes(authUser.uid)
  );

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] bg-surface/80 backdrop-blur-xl border-b border-stone-900/5">
      <div ref={menusRef} className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo and Group Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-brand flex items-center justify-center text-white shadow-md shadow-accent/30 -rotate-6">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl text-stone-900 tracking-tight hidden sm:inline">
              On menjem?
            </span>
          </div>

          {/* Group Switcher */}
          <div className="relative min-w-0">
            <button
              onClick={() => {
                setShowGroupMenu(!showGroupMenu);
                setShowAlertMenu(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 max-w-full rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-sm font-semibold transition-[background-color,transform] active:scale-[0.96]"
            >
              <span className="w-2 h-2 flex-shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
              <span className="min-w-0 max-w-[130px] sm:max-w-[180px] truncate">
                {activeGroup?.name || 'El meu espai'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-stone-500" />
            </button>

            {showGroupMenu && (
              <div className="absolute left-0 mt-2 w-72 rounded-3xl bg-surface shadow-2xl ring-1 ring-stone-900/5 p-2 z-50 text-sm origin-top-left animate-scale-in">
                <button
                  onClick={() => {
                    setActiveGroupId(null);
                    setShowGroupMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-colors ${
                    !activeGroup
                      ? 'bg-accent-soft text-orange-900 font-semibold'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> El meu espai</div>
                    <div className="text-xs text-stone-500">Privat, només el veus tu</div>
                  </div>
                  {!activeGroup && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                </button>

                <div className="px-3 pt-3 pb-1 text-xs font-semibold text-stone-500">
                  Els teus grups ({userGroups.length})
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {userGroups.map((group) => {
                    const isActive = group.id === activeGroup?.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          setActiveGroupId(group.id);
                          setShowGroupMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-colors ${
                          isActive
                            ? 'bg-accent-soft text-orange-900 font-semibold'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div className="truncate">
                          <div>{group.name}</div>
                          <div className="text-xs text-stone-500 font-mono">
                            Codi: {group.code} • {group.memberUids?.length || 1} membres
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-stone-100 mt-1 pt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenCreateGroup();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-accent hover:bg-accent-soft font-semibold transition-colors text-left"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear un nou grup</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenJoinGroup();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl text-stone-700 hover:bg-stone-100 font-medium transition-colors text-left"
                  >
                    <UserPlus className="w-4 h-4 text-stone-500" />
                    <span>Unir-se amb codi</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Alerts Bell (només en grups, i amagat al mòbil on ja surt al BottomNav) */}
          {activeGroup && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => {
                setShowAlertMenu(!showAlertMenu);
                setShowGroupMenu(false);
              }}
              className="relative p-2.5 rounded-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-[background-color,color,transform] active:scale-[0.96]"
              title="Activitat del grup"
              aria-label="Activitat del grup"
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-surface">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-surface shadow-2xl ring-1 ring-stone-900/5 py-3 z-50 origin-top-right animate-scale-in overflow-hidden">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
                  <span className="text-sm font-bold text-stone-900">Activitat del grup</span>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={onMarkAllAlertsRead}
                      className="text-xs text-accent font-semibold hover:underline"
                    >
                      Marcar-ho tot com a llegit
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-500">
                      Cap activitat recent al grup.
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((alert) => {
                      const isUnread = authUser && !alert.readBy?.includes(authUser.uid);
                      return (
                        <div
                          key={alert.id}
                          onClick={() => onMarkAlertRead(alert.id)}
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                            isUnread ? 'bg-accent-soft/60' : 'hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-stone-900">{alert.title}</span>
                            {alert.createdAt && (
                              <span className="text-xs text-stone-500">
                                {timeAgo(alert.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-600 leading-snug">{alert.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* User Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-3.5 rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-sm font-semibold transition-[background-color,transform] active:scale-[0.96]"
            title="El teu perfil"
            aria-label="El teu perfil"
          >
            {authUser?.photoURL ? (
              <img
                src={authUser.photoURL}
                referrerPolicy="no-referrer"
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover ring-2 ring-surface"
              />
            ) : (
              <span className="text-base">{userProfile?.avatar || '🍕'}</span>
            )}
            <span className="hidden sm:inline max-w-[120px] truncate">
              {userProfile?.nickname || 'Perfil'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
