import React from 'react';
import { Check, Globe, MapPin, Star } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { Restaurant } from '../types';
import { instagramUrl, isInstagramHandle, isVisited, mapsUrl, safeHttpUrl, visitAverage } from '../utils/restaurantFields';

interface Props {
  res: Restaurant;
  onOpen: (r: Restaurant) => void;
  onToggleFavorite: (r: Restaurant) => void;
  onRegisterVisit: (r: Restaurant) => void;
}

export const RestaurantCard: React.FC<Props> = ({ res, onOpen, onToggleFavorite, onRegisterVisit }) => {
  const shownRating = visitAverage(res) ?? res.rating;

  return (
    <div
      onClick={() => onOpen(res)}
      className="group bg-surface rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-orange-200 transition flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                {res.cuisine || 'Restaurant'}
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono">
                {res.priceRange || '—'}
              </span>
              {isVisited(res) && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> {res.visits.length === 1 ? '1 visita' : `${res.visits.length} visites`}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-stone-900 group-hover:text-accent transition">
              {/* Botó perquè el detall també s'obri amb el teclat (la targeta només respon al ratolí) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(res);
                }}
                className="text-left rounded focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                {res.name}
              </button>
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {isInstagramHandle(res.instagram) && (
              <a
                href={instagramUrl(res.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-pink-600 transition"
                title={`Obrir @${res.instagram} a Instagram`}
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}
            {safeHttpUrl(res.link) && (
              <a
                href={safeHttpUrl(res.link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                title="Obrir enllaç"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            {/* Favorite toggle button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(res);
              }}
              className={`p-1.5 rounded-full transition ${
                res.favorite ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-stone-500'
              }`}
              title={res.favorite ? 'Treure de favorits' : 'Afegir a favorits'}
            >
              <Star className={`w-4 h-4 ${res.favorite ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Valoració: mitjana de les visites o, si no n'hi ha, la del restaurant */}
        {shownRating != null && (
          <div className="flex items-center gap-3 text-xs text-stone-500 mb-2.5">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="font-bold text-stone-800">{shownRating.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Adreça + Maps */}
        {res.address && (
          <div className="flex items-center justify-between gap-2 text-xs text-stone-500 mb-2">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{res.address}</span>
            </div>
            <a
              href={mapsUrl(res.name, res.address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-0.5 bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition shrink-0"
            >
              Maps
            </a>
          </div>
        )}

        {/* Notes preview */}
        {res.notes && (
          <p className="text-xs text-stone-600 line-clamp-2 italic mb-3 bg-stone-50/80 p-2 rounded-xl">
            "{res.notes}"
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
        <span className="text-xs text-stone-500">
          Per: <strong className="text-stone-600">{res.createdByName || 'Membre'}</strong>
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onRegisterVisit(res)}
            className="p-1.5 rounded-lg text-xs font-semibold transition bg-emerald-600 text-white hover:bg-emerald-700"
            title="Registrar visita"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
