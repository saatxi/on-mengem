import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Posició de la píndola que llisca fins a l'element `[data-active="true"]` de dins del contenidor.
 * El contenidor ha de ser `relative` i la píndola, `absolute top-0 left-0`. La primera posició no s'anima,
 * perquè la píndola no arribi lliscant en carregar la pàgina.
 */
export const useSlidingIndicator = <T extends HTMLElement = HTMLDivElement>(activeKey: unknown) => {
  const containerRef = useRef<T>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);

  // Abans de pintar, perquè no es vegi la píndola a la posició anterior
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    const measure = () =>
      setBox(active ? { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight } : null);
    measure();

    // Torna a mesurar quan canvia la mida (p. ex. el comptador d'una etiqueta o la finestra)
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (active) observer.observe(active);
    return () => observer.disconnect();
  }, [activeKey]);

  // Les transicions s'activen un cop pintada la primera posició
  useEffect(() => {
    if (ready || !box || box.width === 0) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [ready, box]);

  const indicatorStyle: CSSProperties = box
    ? {
        width: box.width,
        height: box.height,
        transform: `translate(${box.x}px, ${box.y}px)`,
        ...(!ready && { transition: 'none' }),
      }
    : { opacity: 0 };

  return { containerRef, indicatorStyle };
};
