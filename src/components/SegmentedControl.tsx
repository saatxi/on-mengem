import React from 'react';
import { cn } from '../utils/cn';

interface Props<T extends string> {
  /** Nom accessible del grup de botons. */
  label: string;
  /** Opcions en ordre: valor → text (o text amb icona). Pot ometre valors que ara no toquen. */
  options: Partial<Record<T, React.ReactNode>>;
  value: T;
  onChange: (value: T) => void;
  /** 'card' sobre una targeta; 'page' sobre el fons de la pàgina, amb un gris una mica més fosc. */
  tone?: 'card' | 'page';
  className?: string;
}

// Selector de píndoles d'una sola opció (filtres, vistes, períodes)
export const SegmentedControl = <T extends string>({ label, options, value, onChange, tone = 'card', className }: Props<T>) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      'flex items-center max-w-full overflow-x-auto rounded-full p-1 text-xs',
      tone === 'card' ? 'bg-stone-100' : 'bg-stone-200/60',
      className,
    )}
  >
    {(Object.keys(options) as T[]).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        aria-pressed={value === option}
        className={cn(
          'shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-[background-color,color,box-shadow]',
          value === option ? 'bg-surface text-stone-900 shadow-card' : 'text-stone-600 hover:text-stone-900',
        )}
      >
        {options[option]}
      </button>
    ))}
  </div>
);
