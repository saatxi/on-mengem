import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  /** Nom accessible del diàleg (el llegeixen els lectors de pantalla). */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Classes extra del panell (p. ex. border-beam per destacar-lo). */
  className?: string;
  /** Al mòbil ocupa tota la pantalla en lloc de ser un full que puja des de baix. */
  fullScreenOnMobile?: boolean;
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diàlegs oberts, de més antic a més nou: Escape només tanca el de sobre (p. ex. la visita oberta des del detall).
const openModals: symbol[] = [];

// Cada diàleg afegeix una entrada a l'historial perquè el botó enrere del mòbil el tanqui en lloc de sortir de l'app.
// L'entrada porta la profunditat del diàleg (1 = el primer obert), i en tornar enrere es tanquen els diàlegs més profunds
// que l'entrada d'arribada. Quan un diàleg es tanca d'una altra manera, es treu la seva entrada amb history.back(): a
// l'entrada d'arribada no hi ha cap diàleg obert més profund, i no cal ignorar cap popstate.
const DEPTH_KEY = 'modalDepth';
const depthOf = (state: unknown): number => {
  const depth = typeof state === 'object' && state !== null ? (state as Record<string, unknown>)[DEPTH_KEY] : undefined;
  return typeof depth === 'number' ? depth : 0;
};

// El navegador resol history.back() cap a l'entrada que hi havia en cridar-lo, encara que mentrestant se n'hagi afegit
// una altra: un diàleg que s'obre quan un altre es tanca (p. ex. «Copiar a un grup» des del detall) perdria la seva.
// Per això, mentre hi ha un back en curs, el diàleg nou espera que acabi per afegir la seva entrada.
/** Temps màxim d'espera, per si el navegador no avisa del back (no hauria de passar). */
const BACK_TIMEOUT_MS = 1000;
let pendingBacks = 0;
let afterBacks: (() => void)[] = [];
let backTimeout: ReturnType<typeof setTimeout> | undefined;

const settleBacks = () => {
  clearTimeout(backTimeout);
  pendingBacks = 0;
  const callbacks = afterBacks;
  afterBacks = [];
  callbacks.forEach((callback) => callback());
};

window.addEventListener('popstate', () => {
  if (pendingBacks > 0 && --pendingBacks === 0) settleBacks();
});

const goBack = () => {
  pendingBacks++;
  clearTimeout(backTimeout);
  backTimeout = setTimeout(settleBacks, BACK_TIMEOUT_MS);
  window.history.back();
};

const afterPendingBacks = (callback: () => void) => {
  if (pendingBacks === 0) callback();
  else afterBacks.push(callback);
};

// Tancament amb animació de sortida, per als botons de dins del diàleg (vegeu ModalCloseButton)
const ModalCloseContext = createContext<() => void>(() => {});

// Al mòbil és un full que puja des de baix; a partir de `sm`, un diàleg centrat.
// Escape, el fons, el botó enrere i ModalCloseButton el tanquen amb una animació i després criden onClose;
// si el pare el desmunta directament (p. ex. en desar un formulari), es tanca sense animació.
export const Modal: React.FC<Props> = ({ label, onClose, children, size = 'md', className, fullScreenOnMobile = false }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const startClosing = () => setClosing(true);
  // onClose sol ser una funció nova a cada render: es guarda en una ref perquè l'efecte només s'executi en muntar.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol(label);
    openModals.push(id);
    const depth = openModals.length;
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    // La pàgina de sota no es desplaça mentre hi ha un diàleg obert
    document.body.style.overflow = 'hidden';

    const isTop = () => openModals[openModals.length - 1] === id;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') setClosing(true);
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
    const handlePopState = (e: PopStateEvent) => {
      if (depthOf(e.state) >= depth) return;
      closedByBack = true;
      setClosing(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    let unmounted = false;
    let inHistory = false;
    afterPendingBacks(() => {
      if (unmounted) return;
      window.history.pushState({ [DEPTH_KEY]: depth }, '');
      window.addEventListener('popstate', handlePopState);
      inHistory = true;
    });

    return () => {
      unmounted = true;
      document.removeEventListener('keydown', handleKeyDown);
      if (inHistory) {
        window.removeEventListener('popstate', handlePopState);
        if (!closedByBack) goBack();
      }
      openModals.splice(openModals.indexOf(id), 1);
      if (openModals.length === 0) document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clicar el fons tanca el diàleg, però només si el clic hi ha començat: seleccionar text d'un camp i
  // deixar anar el botó fora del panell també genera un clic al fons, i no ha de tancar res
  const pressedOnBackdropRef = useRef(false);

  return (
    <div
      onPointerDown={(e) => {
        pressedOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdropRef.current && e.target === e.currentTarget) startClosing();
      }}
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/40 backdrop-blur-sm sm:p-4',
        closing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in',
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onCloseRef.current();
        }}
        className={cn(
          'relative w-full flex flex-col overflow-y-auto overscroll-contain bg-surface shadow-2xl outline-hidden',
          fullScreenOnMobile
            ? 'h-dvh max-h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:h-auto'
            : 'max-h-[calc(100dvh-1.5rem)] rounded-t-3xl pb-[env(safe-area-inset-bottom)]',
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:pb-0 sm:ring-1 sm:ring-stone-900/5',
          closing
            ? cn(fullScreenOnMobile ? 'animate-fade-out' : 'animate-slide-down', 'sm:animate-scale-out')
            : cn(fullScreenOnMobile ? 'animate-fade-in' : 'animate-slide-up', 'sm:animate-scale-in'),
          SIZES[size],
          className,
        )}
      >
        {!fullScreenOnMobile && (
          <div aria-hidden="true" className="sm:hidden mx-auto mt-2 -mb-1 h-1.5 w-10 shrink-0 rounded-full bg-stone-300" />
        )}
        <ModalCloseContext.Provider value={startClosing}>{children}</ModalCloseContext.Provider>
      </div>
    </div>
  );
};

// Botó de dins d'un Modal que el tanca amb l'animació de sortida
export const ModalCloseButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const close = useContext(ModalCloseContext);
  return <button type="button" onClick={close} {...props} />;
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Colors del requadre de la icona (per defecte, els de l'accent). */
  iconClassName?: string;
}

// Capçalera comuna dels diàlegs: es queda fixa a dalt quan el contingut es desplaça
export const ModalHeader: React.FC<HeaderProps> = ({ title, subtitle, icon: Icon, iconClassName }) => (
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
    <ModalCloseButton
      aria-label="Tanca"
      className="p-2 -mr-2 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 hover:bg-stone-200 active:scale-[0.96] transition-[background-color,color,transform]"
    >
      <X className="size-5" />
    </ModalCloseButton>
  </div>
);
