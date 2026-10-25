import React from 'react';
import { ArrowRightLeft, CalendarClock, CheckCircle2, Copy, Globe, Lightbulb, MapPin, Pencil, Trash2 } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { Button } from './Button';
import { CuisineTile } from './CuisineTile';
import { WishlistItem } from '../types';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';
import { instagramUrl, isInstagramHandle, mapsUrl, safeHttpUrl } from '../utils/restaurantFields';

interface Props {
  item: WishlistItem;
  onCopy: (item: WishlistItem) => void;
  /** Només a l'espai personal: els ítems de grup no es poden moure. */
  onMove?: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  /** Sense confirmació: qui crida ofereix «Desfer». */
  onDelete: (item: WishlistItem) => void;
  onTogglePlanned: (item: WishlistItem) => void;
  onMarkVisited: (item: WishlistItem) => void;
}

const ICON_BUTTON = 'p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:scale-[0.9] transition-[background-color,color,transform]';

export const WishlistCard: React.FC<Props> = ({ item, onCopy, onMove, onEdit, onDelete, onTogglePlanned, onMarkVisited }) => {
  const isPlanned = item.status === 'planned';
  const link = safeHttpUrl(item.link);

  return (
    <article className={cn(CARD, 'flex flex-col gap-3 p-5 hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200')}>
      <div className="flex items-start gap-3">
        <CuisineTile cuisine={item.cuisine} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-extrabold tracking-tight leading-snug text-stone-900">{item.restaurantName}</h3>
            {item.status === 'visited' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Provat</span>
            )}
            {isPlanned && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800">Planificat</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-stone-500 truncate">
            {[item.cuisine || 'Sense cuina', item.priceRange].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="flex items-center gap-1 -m-1 shrink-0">
          {isInstagramHandle(item.instagram) && (
            <a
              href={instagramUrl(item.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Obrir @${item.instagram} a Instagram`}
              title={`Obrir @${item.instagram} a Instagram`}
              className="p-2 rounded-full text-pink-600 hover:bg-stone-100 transition-colors"
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
              className="p-2 rounded-full text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {item.address && (
        <a
          href={mapsUrl(item.restaurantName, item.address)}
          target="_blank"
          rel="noopener noreferrer"
          title="Obrir al mapa"
          className="flex items-center gap-1.5 min-w-0 self-start max-w-full text-sm text-stone-500 hover:text-accent transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{item.address}</span>
        </a>
      )}

      {item.recommendedBy && (
        <p className="flex items-start gap-1.5 text-sm text-violet-900 bg-violet-50 px-3 py-2 rounded-2xl">
          <Lightbulb className="w-4 h-4 shrink-0 mt-px text-violet-700" />
          <span>
            Ho recomana <strong className="font-semibold">{item.recommendedBy}</strong>
          </span>
        </p>
      )}

      {item.notes && <p className="text-sm text-stone-600 leading-relaxed">{item.notes}</p>}

      <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <span className="text-xs text-stone-500 truncate">
          Per <strong className="font-semibold text-stone-700">{item.userName || 'Membre'}</strong>
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          {item.status !== 'visited' && (
            <button
              onClick={() => onTogglePlanned(item)}
              aria-pressed={isPlanned}
              aria-label={isPlanned ? 'Treure de planificats' : 'Marcar com a planificat'}
              title={isPlanned ? 'Treure de planificats' : 'Marcar com a planificat'}
              className={cn(ICON_BUTTON, isPlanned && 'text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-800')}
            >
              <CalendarClock className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onCopy(item)} className={ICON_BUTTON} aria-label="Copiar a un grup" title="Copiar a un grup">
            <Copy className="w-4 h-4" />
          </button>
          {onMove && (
            <button onClick={() => onMove(item)} className={ICON_BUTTON} aria-label="Moure a un grup" title="Moure a un grup">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onEdit(item)} className={ICON_BUTTON} aria-label="Editar" title="Editar">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 rounded-full text-stone-500 hover:text-red-600 hover:bg-red-50 active:scale-[0.9] transition-[background-color,color,transform]"
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {item.status !== 'visited' && (
            <Button
              onClick={() => onMarkVisited(item)}
              variant="success"
              size="sm"
              className="ml-1 gap-1"
              title="Registra la visita i passa'l a la llista de restaurants"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hi he anat</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};
