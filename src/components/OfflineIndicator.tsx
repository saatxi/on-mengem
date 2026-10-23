import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

// A dalt, sota la capçalera: a baix xocaria amb el botó flotant i la barra de navegació del mòbil
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-[calc(4.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-max max-w-[calc(100vw-2rem)] rounded-full bg-inverse/90 text-on-inverse px-4 py-2 text-xs font-medium shadow-xl backdrop-blur-md animate-fade-in"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
      <span>Sense connexió: els canvis no es desaran fins que tornis a estar en línia.</span>
    </div>
  );
};
