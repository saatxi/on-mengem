import React from 'react';
import { cuisineStyle } from '../utils/restaurantFields';
import { cn } from '../utils/cn';

interface Props {
  cuisine?: string;
  className?: string;
}

// Requadre amb l'emoji de la cuina sobre un fons del seu to; és decoratiu perquè el nom de la cuina ja surt al costat
export const CuisineTile: React.FC<Props> = ({ cuisine, className }) => {
  const { emoji, hue } = cuisineStyle(cuisine);

  return (
    <span
      aria-hidden="true"
      style={{ '--cuisine-hue': hue } as React.CSSProperties}
      className={cn(
        'size-12 shrink-0 rounded-2xl bg-cuisine flex items-center justify-center text-2xl leading-none select-none',
        className,
      )}
    >
      {emoji}
    </span>
  );
};
