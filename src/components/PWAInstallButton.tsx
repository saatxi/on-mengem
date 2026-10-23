import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isAndroid = /android/i.test(window.navigator.userAgent);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-brand hover:brightness-110 p-2 sm:px-3.5 text-xs font-semibold text-white shadow-md shadow-accent/30 transition-[filter,transform] active:scale-[0.96]"
        title="Instal·la On menjem? al teu dispositiu"
        aria-label="Instal·lar app"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instal·lar app</span>
      </button>
    );
  }

  // Guia manual: iOS (Safari) i Android quan el navegador no ofereix el diàleg d'instal·lació
  if (isIOS || isAndroid) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-accent-soft p-2 sm:px-3.5 text-xs font-semibold text-orange-800 hover:bg-accent-soft transition-[background-color,transform] active:scale-[0.96]"
          title={isIOS ? 'Instal·la a iPhone o iPad' : 'Instal·la a Android'}
          aria-label="Instal·lar app"
        >
          <Smartphone className="w-3.5 h-3.5 text-accent" />
          <span className="hidden sm:inline">Instal·lar</span>
        </button>

        {/* Portal a body: el backdrop-filter del header faria que el fixed quedés confinat dins seu */}
        {showIOSGuide && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm max-h-full overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl border border-stone-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
                    OM
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Instal·la On menjem? a {isIOS ? 'iOS' : 'Android'}</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tanca"
                  className="rounded-full p-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-stone-600">
                {(isIOS
                  ? [
                      <>Obre aquesta pàgina amb <strong>Safari</strong> (a iOS només Safari pot instal·lar apps). Toca el botó <strong>Compartir</strong> (quadrat amb fletxa cap amunt <span className="text-blue-600">⎋</span>).</>,
                      <>Desplaça't cap avall i selecciona <strong>Afegeix a la pantalla d'inici</strong>.</>,
                      <>Prem <strong>Afegeix</strong> a dalt a la dreta. On menjem? apareixerà com una app més!</>,
                    ]
                  : [
                      <>Obre aquesta pàgina amb <strong>Chrome</strong> i toca el menú <strong>⋮</strong> (tres punts) a dalt a la dreta.</>,
                      <>Selecciona <strong>Instal·la l'aplicació</strong> (o <strong>Afegeix a la pantalla d'inici</strong>).</>,
                      <>Confirma amb <strong>Instal·la</strong>. L'app apareixerà al calaix d'aplicacions i a la pantalla d'inici.</>,
                    ]
                ).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-2xl bg-accent-soft/60">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-inverse py-2.5 text-sm font-semibold text-on-inverse hover:opacity-90 transition"
              >
                Entesos
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return null;
};
