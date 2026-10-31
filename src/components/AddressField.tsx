import React, { lazy, Suspense } from 'react';
import { AlertTriangle, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from './Button';
import type { AddressLocation } from '../hooks/useAddressLocation';
import { areaLabel } from '../utils/areas';
import { cn } from '../utils/cn';
import { FIELD, LABEL } from '../utils/ui';

// Leaflet només es descarrega si el formulari arriba a mostrar el mapa.
const LocationPicker = lazy(() => import('./LocationPicker').then((m) => ({ default: m.LocationPicker })));

// Colors de cada formulari: taronja per als restaurants i violeta per als desitjats
const TONES = {
  restaurant: { icon: 'text-accent', selected: 'bg-accent-soft text-orange-900', review: 'text-accent' },
  wish: { icon: 'text-violet-700', selected: 'bg-violet-50 text-violet-900', review: 'text-violet-700' },
};

interface Props {
  id: string;
  location: AddressLocation;
  tone: keyof typeof TONES;
  placeholder?: string;
}

// Camp d'adreça amb botó de cerca, resultats per triar i un mapa petit per ajustar-ne el punt (useAddressLocation).
export const AddressField: React.FC<Props> = ({ id, location, tone, placeholder }) => {
  const { address, setAddress, search, searching, lookupResult, matches, choose, located, setLocation, reviewBeforeSave, values } =
    location;
  const area = areaLabel(values);
  const colors = TONES[tone];
  const selectedMatch = located ? matches.findIndex((m) => m.lat === located.lat && m.lng === located.lng) : -1;

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        <MapPin className="w-3.5 h-3.5 text-stone-500" />
        Adreça (opcional)
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          className={cn(FIELD, 'min-w-0')}
        />
        <Button
          variant="secondary"
          onClick={() => void search()}
          disabled={!address.trim() || searching}
          aria-label="Buscar l'adreça al mapa"
          className="shrink-0"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className={cn('w-4 h-4', colors.icon)} />}
          <span className="hidden sm:inline">Buscar</span>
        </Button>
      </div>

      <div aria-live="polite">
        {lookupResult === 'notFound' && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
            No s'ha trobat aquesta adreça. Revisa-la o afegeix-hi el número i la població; també pots desar sense ubicar-lo al mapa.
          </p>
        )}
        {lookupResult === 'failed' && (
          <p className="mt-1.5 text-xs text-stone-500">
            Ara no s'ha pogut consultar el mapa. Pots desar igualment i ubicar-lo més tard des de la vista de mapa.
          </p>
        )}
        {located && reviewBeforeSave && (
          <p className={cn('mt-1.5 text-xs font-semibold', colors.review)}>Comprova que el punt és al lloc correcte i torna a desar.</p>
        )}
      </div>

      {located && matches.length > 1 && (
        <div className="mt-2">
          <p className="text-xs text-stone-500 mb-1">Hi ha més d'un resultat: tria el bo.</p>
          <ul className="space-y-1">
            {matches.map((m, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(m)}
                  aria-pressed={i === selectedMatch}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-2xl text-xs transition-colors',
                    i === selectedMatch ? cn(colors.selected, 'font-semibold') : 'text-stone-600 hover:bg-stone-100',
                  )}
                >
                  <span className="line-clamp-2">{m.label || `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {located && (
        <div className="mt-2 space-y-1.5">
          <Suspense fallback={<div className="h-48 rounded-2xl bg-stone-100 animate-pulse" />}>
            <LocationPicker value={located} onChange={setLocation} wish={tone === 'wish'} />
          </Suspense>
          <p className="text-xs text-stone-500">
            {area && (
              <>
                Zona: <strong className="font-semibold text-stone-700">{area}</strong>.{' '}
              </>
            )}
            Si el punt no és al lloc exacte, arrossega'l o toca el mapa on hauria d'anar.
          </p>
        </div>
      )}
    </div>
  );
};
