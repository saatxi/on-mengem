import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

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
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-[background-color,color,box-shadow] whitespace-nowrap',
      active ? 'bg-surface text-accent shadow-card' : 'text-stone-600 hover:text-stone-900',
    )}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);
