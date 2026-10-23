import React, { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';

// Una comprovació al dia com a màxim: amb l'app oberta i en tornar-hi des de segon pla
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Avisa quan hi ha una versió nova publicada. No es recarrega sola per no perdre un formulari a mig omplir.
export const UpdatePrompt: React.FC = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastCheckRef = useRef(Date.now());

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null;
    },
  });

  // Una PWA instal·lada que es reprèn des de segon pla no torna a navegar, i el navegador no buscaria el sw.js nou
  useEffect(() => {
    const checkForUpdate = () => {
      const registration = registrationRef.current;
      if (!registration || !navigator.onLine || Date.now() - lastCheckRef.current < CHECK_INTERVAL_MS) return;
      lastCheckRef.current = Date.now();
      registration.update().catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    const timer = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // workbox-window només recarrega sol si la pàgina ja la controlava un SW; a la primera visita cal fer-ho a mà
  const handleUpdate = async () => {
    const wasControlled = !!navigator.serviceWorker.controller;
    await updateServiceWorker(true);
    if (!wasControlled) window.location.reload();
  };

  if (!needRefresh) return null;

  // A baix, per sobre del botó flotant i la barra de navegació del mòbil
  return (
    <div
      role="status"
      className="fixed bottom-[calc(var(--bottom-nav-h)+5.5rem)] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 w-max max-w-[calc(100vw-2rem)] rounded-full bg-inverse text-on-inverse pl-4 pr-1.5 py-1.5 text-sm font-medium shadow-xl animate-fade-in"
    >
      <RefreshCw className="w-4 h-4 shrink-0 text-accent" />
      <span>Hi ha una versió nova</span>
      <Button size="sm" variant="brand" onClick={handleUpdate}>
        Actualitza
      </Button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="p-1.5 -ml-1 rounded-full opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Més tard"
        title="Més tard"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
