import React from 'react';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';

interface Props {
  /** Pestanya activa: quan canvia, la píndola llisca fins al TabButton marcat com a actiu. */
  activeTab: string;
  children: React.ReactNode;
}

// Barra de pestanyes d'escriptori (al mòbil hi ha el BottomNav)
export const TabBar: React.FC<Props> = ({ activeTab, children }) => {
  const { containerRef, indicatorStyle } = useSlidingIndicator(activeTab);

  return (
    <div
      ref={containerRef}
      className="relative hidden sm:flex w-fit items-center gap-1 p-1.5 bg-stone-200/60 rounded-full mb-6 max-w-full overflow-x-auto scrollbar-none"
    >
      <span
        aria-hidden="true"
        style={indicatorStyle}
        className="absolute top-0 left-0 rounded-full bg-surface shadow-card transition-[transform,width,height] duration-300 ease-out-soft"
      />
      {children}
    </div>
  );
};
