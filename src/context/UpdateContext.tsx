import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Una comprovació al dia com a màxim: amb l'app oberta i en tornar-hi des de segon pla
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface UpdateContextType {
  /** Hi ha una versió nova publicada i esperant. */
  needRefresh: boolean;
  /** Activa la versió nova i recarrega la pàgina. */
  update: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | null>(null);

// Registra el Service Worker i detecta les versions noves. No es recarrega sol per no perdre un formulari a mig omplir:
// l'UpdateButton de la barra superior avisa i l'usuari decideix quan actualitzar.
export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastCheckRef = useRef(Date.now());

  const {
    needRefresh: [needRefresh],
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
  const update = async () => {
    const wasControlled = !!navigator.serviceWorker.controller;
    await updateServiceWorker(true);
    if (!wasControlled) window.location.reload();
  };

  return <UpdateContext.Provider value={{ needRefresh, update }}>{children}</UpdateContext.Provider>;
};

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
}
