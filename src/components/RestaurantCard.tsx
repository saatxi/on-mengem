import React from 'react';
import { Check, Globe, MapPin, Plus, Star } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { Button } from './Button';
import { CuisineTile } from './CuisineTile';
import { Restaurant } from '../types';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { instagramUrl, isInstagramHandle, isVisited, mapsUrl, safeHttpUrl, visitAverage } from '../utils/restaurantFields';

interface Props {
  res: Restaurant;
  onOpen: (r: Restaurant) => void;
  onToggleFavorite: (r: Restaurant) => void;
  onRegisterVisit: (r: Restaurant) => void;
}

// Els elements interactius de dins de la targeta van per sobre del botó del títol, que la cobreix sencera
const OVER = 'relative z-10';

export const RestaurantCard: React.FC<Props> = ({ res, onOpen, onToggleFavorite, onRegisterVisit }) => {
  const shownRating = visitAverage(res) ?? res.rating;
  const link = safeHttpUrl(res.link);
  const visitCount = res.visits.length;

  return (
    <article
      className={cn(
        CARD,
        'group relative flex flex-col gap-3 p-5 hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200',
      )}
    >
      <div className="flex items-start gap-3">
        <CuisineTile cuisine={res.cuisine} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold tracking-tight leading-snug text-stone-900 group-hover:text-accent transition-colors">
            <button
              type="button"
              onClick={() => onOpen(res)}
              className="text-left after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
            >
              {res.name}
            </button>
          </h3>
          <p className="mt-0.5 text-sm text-stone-500 truncate">
            {[res.cuisine || 'Restaurant', res.priceRange].filter(Boolean).join(' · ')}
          </p>
        </div>

        <button
          onClick={() => onToggleFavorite(res)}
          aria-pressed={!!res.favorite}
          aria-label={res.favorite ? 'Treure de favorits' : 'Afegir a favorits'}
          title={res.favorite ? 'Treure de favorits' : 'Afegir a favorits'}
          className={cn(
            OVER,
            'p-2 -m-1 shrink-0 rounded-full',
            res.favorite ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-amber-400 hover:bg-stone-100',
            'active:scale-[0.9] transition-[background-color,color,transform]',
          )}
        >
          <Star className={cn('w-5 h-5', res.favorite && 'fill-amber-400')} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {/* Valoració: mitjana de les visites o, si no n'hi ha, la del restaurant */}
        {shownRating != null && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <strong className="font-bold tabular-nums">{shownRating.toFixed(1)}</strong>
          </span>
        )}
        {isVisited(res) ? (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 font-semibold text-emerald-800">
            <Check className="w-3.5 h-3.5" />
            {visitCount === 1 ? '1 visita' : `${visitCount} visites`}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-accent-soft font-semibold text-orange-800">Per anar</span>
        )}
      </div>

      {res.address && (
        <a
          href={mapsUrl(res.name, res.address)}
          target="_blank"
          rel="noopener noreferrer"
          title="Obrir al mapa"
          className={cn(
            OVER,
            'flex items-center gap-1.5 min-w-0 self-start max-w-full text-sm text-stone-500 hover:text-accent transition-colors',
          )}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{res.address}</span>
        </a>
      )}

      {res.notes && <p className="text-sm text-stone-600 leading-relaxed line-clamp-2">{res.notes}</p>}

      <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <span className="text-xs text-stone-500 truncate">
          Per <strong className="font-semibold text-stone-700">{res.createdByName || 'Membre'}</strong>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {isInstagramHandle(res.instagram) && (
            <a
              href={instagramUrl(res.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Obrir @${res.instagram} a Instagram`}
              title={`Obrir @${res.instagram} a Instagram`}
              className={cn(OVER, 'p-2 rounded-full text-pink-600 hover:bg-stone-100 transition-colors')}
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
          )}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Obrir el web"
              title="Obrir el web"
              className={cn(OVER, 'p-2 rounded-full text-stone-600 hover:bg-stone-100 transition-colors')}
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
          <Button onClick={() => onRegisterVisit(res)} variant="success" size="sm" className={cn(OVER, 'ml-1 gap-1')}>
            <Plus className="w-3.5 h-3.5" />
            <span>Visita</span>
          </Button>
        </div>
      </div>
    </article>
  );
};
