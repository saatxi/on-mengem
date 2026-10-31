import React from 'react';

const ANGLES = [0, 60, 120, 180, 240, 300];

// Espurnes ambre que surten de l'estrella en marcar un favorit. Va dins d'un botó `relative`; per tornar-les
// a disparar, el pare la remunta amb una `key` nova.
export const FavoriteBurst: React.FC = () => (
  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
    {ANGLES.map((angle) => (
      <span
        key={angle}
        style={{ '--burst-angle': `${angle}deg` } as React.CSSProperties}
        className="absolute left-1/2 top-1/2 -ml-0.75 -mt-0.75 size-1.5 rounded-full bg-amber-400 animate-burst"
      />
    ))}
  </span>
);
