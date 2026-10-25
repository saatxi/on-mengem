import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUpdate } from '../context/UpdateContext';
import { cn } from '../utils/cn';

// Botó de la barra superior que només apareix quan hi ha una versió nova: al mòbil, la icona amb un punt; a l'escriptori, amb text
export const UpdateButton: React.FC = () => {
  const { needRefresh, update } = useUpdate();
  const [updating, setUpdating] = useState(false);

  if (!needRefresh) return null;

  const handleClick = () => {
    setUpdating(true);
    update().catch(() => setUpdating(false));
  };

  return (
    <button
      onClick={handleClick}
      disabled={updating}
      className="relative flex items-center gap-1.5 rounded-full bg-accent-soft p-2 sm:px-3.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 transition-[background-color,transform] active:scale-[0.96] disabled:opacity-70 animate-scale-in"
      title="Hi ha una versió nova de l'app. Toca per actualitzar."
      aria-label="Actualitzar a la versió nova"
    >
      <RefreshCw className={cn('w-3.5 h-3.5 text-accent', updating && 'animate-spin')} />
      <span className="hidden sm:inline">{updating ? 'Actualitzant...' : 'Actualitzar'}</span>
      {/* Punt d'avís (només al mòbil, on no hi ha text) */}
      <span aria-hidden="true" className="sm:hidden absolute top-0.5 right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-surface" />
    </button>
  );
};
