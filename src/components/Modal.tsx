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

// Cada diàleg afegeix una entrada a l'historial perquè el botó enrere del mòbil el tanqui en lloc de sortir de l'app.
// Quan es tanca d'una altra manera, es treu la seva entrada amb history.back(), i aquest popstate s'ha d'ignorar.
let ignoreNextPopState = false;

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

    let closedByBack = false;
    const handlePopState = () => {
      if (ignoreNextPopState) {
        ignoreNextPopState = false;
        return;
      }
      if (!isTop()) return;
      closedByBack = true;
      onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.history.pushState({ modal: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      if (!closedByBack) {
        ignoreNextPopState = true;
        window.history.back();
      }
      openModals.splice(openModals.indexOf(id), 1);
      if (openModals.length === 0) document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/40 backdrop-blur-sm sm:p-4 animate-fade-in">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'relative w-full flex flex-col overflow-y-auto overscroll-contain bg-surface shadow-2xl outline-hidden',
          'max-h-[calc(100dvh-1.5rem)] rounded-t-3xl pb-[env(safe-area-inset-bottom)] animate-slide-up',
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:pb-0 sm:ring-1 sm:ring-stone-900/5 sm:animate-scale-in',
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
  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-surface/90 backdrop-blur-md border-b border-stone-100">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <span className={cn('size-11 shrink-0 rounded-2xl flex items-center justify-center bg-accent-soft text-accent', iconClassName)}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-tight text-stone-900 truncate">{title}</h2>
        {subtitle && <p className="text-sm text-stone-500 truncate">{subtitle}</p>}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Tanca"
      className="p-2 -mr-2 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 hover:bg-stone-200 active:scale-[0.96] transition-[background-color,color,transform]"
    >
      <X className="size-5" />
    </button>
  </div>
);
