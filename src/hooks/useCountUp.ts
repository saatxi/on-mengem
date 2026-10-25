import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 900;

/** Valor que puja fins a `target` amb una corba que frena al final. Sense animació si l'usuari redueix el moviment. */
export const useCountUp = (target: number) => {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  // D'on surt la propera animació: el valor que es veu en aquell moment
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target || prefersReducedMotion()) {
      shownRef.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      shownRef.current = from + (target - from) * eased;
      setValue(shownRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
