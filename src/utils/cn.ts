import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Combina classes condicionals i resol els conflictes de Tailwind (l'última guanya).
// Coneix els tokens semàntics dels estils (src/styles/): rounded-card|inner|control|soft|tile i les ombres shadow-*
const twMerge = extendTailwindMerge({
  extend: {
    theme: { radius: ['card', 'inner', 'control', 'soft', 'tile'] },
    classGroups: { shadow: [{ shadow: ['card', 'card-hover', 'raised', 'float', 'popover', 'modal'] }] },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
