import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-stone-900/90 text-white px-4 py-2 text-xs font-medium shadow-xl backdrop-blur-md border border-stone-700 animate-bounce">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Sense connexió — Utilitzant dades emmagatzemades en local.</span>
    </div>
  );
};
