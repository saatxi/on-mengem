import React from 'react';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  count?: number;
  className: string;
}

// Targetes buides mentre arriben les dades, amb la forma de les de debò: la graella no salta quan es carreguen
export const CardSkeletons: React.FC<Props> = ({ count = 6, className }) => (
  <div className={className} aria-busy="true" aria-label="Carregant">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className={cn(CARD, 'p-5 flex flex-col gap-3')}>
        <div className="flex items-start gap-3">
          <div className="size-12 shrink-0 rounded-2xl shimmer" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded-full shimmer" />
            <div className="h-3 w-1/3 rounded-full shimmer" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-14 rounded-full shimmer" />
          <div className="h-6 w-20 rounded-full shimmer" />
        </div>
        <div className="h-3 w-1/2 rounded-full shimmer" />
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="h-3 w-1/4 rounded-full shimmer" />
          <div className="h-8 w-20 rounded-full shimmer" />
        </div>
      </div>
    ))}
  </div>
);
