import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combina classes condicionals i resol els conflictes de Tailwind (l'última guanya)
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
