import type { PointerEvent } from 'react';

/** Mou el halo de la utilitat `spotlight` fins al cursor (sense estat de React, per no fer rerenders). */
export const trackSpotlight = (e: PointerEvent<HTMLElement>) => {
  if (e.pointerType !== 'mouse') return;
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
  card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
};
