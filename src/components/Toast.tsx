import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { usePresence } from '../hooks/usePresence';

interface Props {
  message: string | null;
  onClose: () => void;
  variant?: 'error' | 'success';
  /** Acció opcional, p. ex. «Desfer». */
  action?: { label: string; onClick: () => void };
}

const DURATION = { error: 6000, success: 4000 };

export const Toast: React.FC<Props> = ({ message, onClose, variant = 'error', action }) => {
  const { mounted, closing, onAnimationEnd } = usePresence(!!message);
  // Mentre surt, el pare ja ha esborrat el missatge: es continua mostrant el darrer
  const shownRef = useRef({ message, variant, action });
  if (message) shownRef.current = { message, variant, action };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, DURATION[variant]);
    return () => clearTimeout(timer);
  }, [message, onClose, variant]);

  if (!mounted) return null;

  const shown = shownRef.current;
  const isError = shown.variant === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle2;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      onAnimationEnd={onAnimationEnd}
      className={cn(
        'fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 w-max max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium shadow-xl',
        closing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in',
        isError ? 'bg-red-600 text-white' : 'bg-inverse text-on-inverse',
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', !isError && 'text-emerald-400')} />
      <span>{shown.message}</span>
      {shown.action && (
        <button
          onClick={() => {
            shown.action?.onClick();
            onClose();
          }}
          className="ml-1 px-2 py-1 rounded-lg font-bold underline underline-offset-2 hover:opacity-80 transition"
        >
          {shown.action.label}
        </button>
      )}
      <button onClick={onClose} className="ml-1 p-1 rounded-lg opacity-80 hover:opacity-100 transition" aria-label="Tanca">
        <X className="w-4 h-4" />
      </button>
      {/* Temps que queda abans que es tanqui sol; es reinicia amb cada missatge nou */}
      <span
        key={shown.message}
        aria-hidden="true"
        style={{ animationDuration: `${DURATION[shown.variant]}ms` }}
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-current opacity-30 animate-toast-timer motion-reduce:hidden"
      />
    </div>
  );
};
