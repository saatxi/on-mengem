import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

// Pestanya de la barra de navegació d'escriptori (al mòbil hi ha el BottomNav)
export const TabButton: React.FC<Props> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
      active ? 'bg-white text-orange-600 shadow-xs' : 'text-stone-600 hover:text-stone-900'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);
