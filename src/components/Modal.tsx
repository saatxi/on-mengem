import React, { useEffect, useRef } from 'react';

interface Props {
  /** Nom accessible del diàleg (el llegeixen els lectors de pantalla). */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
}

const DEFAULT_OVERLAY = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto';
const DEFAULT_PANEL = 'relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6';

// Diàlegs oberts, de més antic a més nou: Escape només tanca el de sobre (p. ex. la visita oberta des del detall).
const openModals: symbol[] = [];

export const Modal: React.FC<Props> = ({
  label,
  onClose,
  children,
  overlayClassName = DEFAULT_OVERLAY,
  panelClassName = DEFAULT_PANEL,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose sol ser una funció nova a cada render: es guarda en una ref perquè l'efecte només s'executi en muntar.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol(label);
    openModals.push(id);
    const previousFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      previousFocus?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={overlayClassName}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`${panelClassName} outline-hidden`}
      >
        {children}
      </div>
    </div>
  );
};
