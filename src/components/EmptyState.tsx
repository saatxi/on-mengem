import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { EMPTY_STATE } from '../utils/ui';

interface Props {
  title: string;
  /** Icona destacada, amb emojis de cuina que suren al voltant. Sense icona, la targeta és més baixa. */
  icon?: LucideIcon;
  /** 'brand' per als restaurants; 'wish' (violeta) per als desitjats. */
  tone?: 'brand' | 'wish';
  /** Text explicatiu sota el títol. */
  children?: React.ReactNode;
  /** Botons d'acció. */
  actions?: React.ReactNode;
}

const ICON_TONES = {
  brand: 'bg-brand shadow-accent/30',
  wish: 'bg-violet-600 shadow-violet-600/30',
};

// Emojis decoratius al voltant de la icona: posició i retard, perquè no surin alhora
const FLOATING_EMOJIS = [
  { emoji: '🍕', className: '-left-9 top-1', delay: '0ms' },
  { emoji: '🍣', className: '-right-10 top-5', delay: '600ms' },
  { emoji: '🌮', className: '-left-5 -bottom-4', delay: '1200ms' },
];

// Estat buit d'una llista (sense resultats o encara sense elements)
export const EmptyState: React.FC<Props> = ({ title, icon: Icon, tone = 'brand', children, actions }) => (
  <div className={cn(EMPTY_STATE, !Icon && 'py-12')}>
    {Icon && (
      <div className="relative w-16 h-16 mx-auto mb-5">
        {FLOATING_EMOJIS.map(({ emoji, className, delay }) => (
          <span
            key={emoji}
            aria-hidden="true"
            style={{ animationDelay: delay }}
            className={cn('absolute text-xl leading-none select-none opacity-80 animate-float', className)}
          >
            {emoji}
          </span>
        ))}
        <div
          className={cn(
            'w-16 h-16 rounded-3xl text-white shadow-lg flex items-center justify-center -rotate-6 animate-float',
            ICON_TONES[tone],
          )}
        >
          <Icon className="w-7 h-7" />
        </div>
      </div>
    )}
    <h3 className="text-lg font-extrabold tracking-tight text-stone-900">{title}</h3>
    {children && <p className="text-sm text-stone-500 max-w-sm mx-auto">{children}</p>}
    {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
  </div>
);
