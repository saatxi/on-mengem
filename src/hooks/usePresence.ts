import { useState, type AnimationEvent } from 'react';

/**
 * Manté un element muntat mentre fa l'animació de sortida. Quan `open` passa a false, `closing` és true
 * fins que acaba l'animació de l'element que rep `onAnimationEnd` (les dels fills no compten).
 */
export const usePresence = (open: boolean) => {
  const [mounted, setMounted] = useState(open);
  // Es torna a muntar tan bon punt s'obre, durant el mateix render
  if (open && !mounted) setMounted(true);

  const onAnimationEnd = (e: AnimationEvent) => {
    if (!open && e.target === e.currentTarget) setMounted(false);
  };

  return { mounted: open || mounted, closing: !open && mounted, onAnimationEnd };
};
