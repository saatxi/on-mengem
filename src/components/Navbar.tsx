import React, { useEffect, useRef, useState } from 'react';
import {
  Utensils,
  ChevronDown,
  Plus,
  UserPlus,
  Bell,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Alert } from '../types';

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div ref={menusRef} className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo and Group Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-stone-900 tracking-tight hidden sm:inline">
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
              className="flex items-center gap-1.5 px-3 py-1.5 max-w-full rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-bold transition active:scale-95"
            >
              <span className="w-2 h-2 flex-shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="min-w-0 max-w-[130px] sm:max-w-[180px] truncate">
                {activeGroup?.name || 'El meu espai'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-stone-500" />
            </button>

            {showGroupMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-stone-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setActiveGroupId(null);
                    setShowGroupMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                    !activeGroup
                      ? 'bg-orange-50 text-orange-900 font-bold'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div>
                    <div>🏠 El meu espai</div>
                    <div className="text-[10px] text-stone-400">Privat, només el veus tu</div>
                  </div>
                  {!activeGroup && <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                </button>

                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                          isActive
                            ? 'bg-orange-50 text-orange-900 font-bold'
                            : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <div className="truncate">
                          <div>{group.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            Codi: {group.code} • {group.memberUids?.length || 1} membres
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />}
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-orange-600 hover:bg-orange-50 font-bold transition text-left"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear un nou grup</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenJoinGroup();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:bg-stone-50 font-medium transition text-left"
                  >
                    <UserPlus className="w-4 h-4 text-stone-400" />
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
              className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition active:scale-95"
              title="Notificacions i activitat del grup"
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-orange-600 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl border border-stone-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-800">Activitat del grup</span>
                  {unreadAlerts.length > 0 && (
                    <button
                      onClick={onMarkAllAlertsRead}
                      className="text-[11px] text-orange-600 font-semibold hover:underline"
                    >
                      Marcar-ho tot com a llegit
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      Cap activitat recent al grup.
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((alert) => {
                      const isUnread = authUser && !alert.readBy?.includes(authUser.uid);
                      return (
                        <div
                          key={alert.id}
                          onClick={() => onMarkAlertRead(alert.id)}
                          className={`p-3 text-xs cursor-pointer transition ${
                            isUnread ? 'bg-orange-50/60' : 'hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-stone-900">{alert.title}</span>
                            {alert.createdAt && (
                              <span className="text-[10px] text-stone-400">
                                {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-3 rounded-full bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-800 text-xs font-bold transition active:scale-95"
            title="El teu perfil d'usuari"
          >
            {authUser?.photoURL ? (
              <img
                src={authUser.photoURL}
                referrerPolicy="no-referrer"
                alt="Avatar"
                className="w-5 h-5 rounded-full object-cover"
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
