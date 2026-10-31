import React from 'react';
import { cn } from '../utils/cn';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';

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

// Selector de píndoles d'una sola opció (filtres, vistes, períodes); la píndola blanca llisca fins a l'opció triada
export const SegmentedControl = <T extends string>({ label, options, value, onChange, tone = 'card', className }: Props<T>) => {
  const { containerRef, indicatorStyle } = useSlidingIndicator(value);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      className={cn(
        'relative flex items-center max-w-full overflow-x-auto scrollbar-none rounded-full p-1 text-xs',
        tone === 'card' ? 'bg-stone-100' : 'bg-stone-200/60',
        className,
      )}
    >
      <span
        aria-hidden="true"
        style={indicatorStyle}
        className="absolute top-0 left-0 rounded-full bg-surface shadow-card transition-[transform,width,height] duration-300 ease-out-soft"
      />
      {(Object.keys(options) as T[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          data-active={value === option}
          className={cn(
            'relative shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-colors',
            value === option ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {options[option]}
        </button>
      ))}
    </div>
  );
};
