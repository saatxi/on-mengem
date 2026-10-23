import React, { useEffect, useRef } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  /** Nom accessible del diàleg (el llegeixen els lectors de pantalla). */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diàlegs oberts, de més antic a més nou: Escape només tanca el de sobre (p. ex. la visita oberta des del detall).
const openModals: symbol[] = [];

// Al mòbil és un full que puja des de baix; a partir de `sm`, un diàleg centrat.
export const Modal: React.FC<Props> = ({ label, onClose, children, size = 'md' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose sol ser una funció nova a cada render: es guarda en una ref perquè l'efecte només s'executi en muntar.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol(label);
    openModals.push(id);
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    // La pàgina de sota no es desplaça mentre hi ha un diàleg obert
    document.body.style.overflow = 'hidden';

    const isTop = () => openModals[openModals.length - 1] === id;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab') trapFocus(e);
    };

    // El tabulador no surt del diàleg: de l'últim element salta al primer i a l'inrevés
    const trapFocus = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      if (openModals.length === 0) document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4 animate-fade-in">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'relative w-full flex flex-col overflow-y-auto overscroll-contain bg-surface shadow-2xl outline-hidden',
          'max-h-[calc(100dvh-1.5rem)] rounded-t-3xl pb-[env(safe-area-inset-bottom)] animate-slide-up',
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:pb-0 sm:border sm:border-stone-200 sm:animate-scale-in',
          SIZES[size],
        )}
      >
        <div aria-hidden="true" className="sm:hidden mx-auto mt-2 -mb-1 h-1.5 w-10 shrink-0 rounded-full bg-stone-300" />
        {children}
      </div>
    </div>
  );
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Colors del requadre de la icona (per defecte, els de l'accent). */
  iconClassName?: string;
  onClose: () => void;
}

// Capçalera comuna dels diàlegs: es queda fixa a dalt quan el contingut es desplaça
export const ModalHeader: React.FC<HeaderProps> = ({ title, subtitle, icon: Icon, iconClassName, onClose }) => (
  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-surface/95 backdrop-blur-md border-b border-stone-100">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <span className={cn('size-10 shrink-0 rounded-xl flex items-center justify-center bg-orange-100 text-accent', iconClassName)}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-base font-bold text-stone-900 truncate">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 truncate">{subtitle}</p>}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Tanca"
      className="p-2 -mr-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
    >
      <X className="size-5" />
    </button>
  </div>
);
