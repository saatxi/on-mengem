import React from 'react';
import { cn } from '../utils/cn';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'wish' | 'success' | 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-md shadow-accent/25',
  brand: 'bg-brand hover:brightness-110 text-white shadow-md shadow-accent/30',
  wish: 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/25',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20',
  secondary: 'bg-surface text-stone-800 ring-1 ring-stone-200 hover:bg-stone-100',
  ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
};

const SIZES = {
  sm: 'gap-1.5 px-3.5 py-2 text-xs',
  md: 'gap-2 px-4 py-2.5 text-sm',
  lg: 'gap-2 px-5 py-3 text-sm',
};

// Botó en forma de píndola amb les variants de l'app
export const Button: React.FC<Props> = ({ variant = 'primary', size = 'md', type = 'button', className, ...props }) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,filter] active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...props}
  />
);
