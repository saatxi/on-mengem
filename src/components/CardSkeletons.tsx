import React from 'react';

interface Props {
  count?: number;
  className: string;
}

// Targetes buides mentre arriben les dades: la graella no salta quan es carreguen
export const CardSkeletons: React.FC<Props> = ({ count = 6, className }) => (
  <div className={className} aria-busy="true" aria-label="Carregant">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="bg-surface rounded-2xl p-4 border border-stone-200/90 space-y-3 animate-pulse">
        <div className="h-4 w-2/3 rounded-md bg-stone-200" />
        <div className="h-3 w-1/3 rounded-md bg-stone-100" />
        <div className="h-3 w-1/2 rounded-md bg-stone-100" />
        <div className="pt-3 border-t border-stone-100 flex justify-between">
          <div className="h-3 w-1/4 rounded-md bg-stone-100" />
          <div className="h-7 w-16 rounded-xl bg-stone-200" />
        </div>
      </div>
    ))}
  </div>
);
