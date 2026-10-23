import React from 'react';
import { ArrowRightLeft, CheckCircle2, Copy, Globe, MapPin, Pencil } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { WishlistItem } from '../types';
import { useConfirm } from './ConfirmDialog';
import { instagramUrl, isInstagramHandle, mapsUrl, safeHttpUrl } from '../utils/restaurantFields';

interface Props {
  item: WishlistItem;
  onCopy: (item: WishlistItem) => void;
  /** Només a l'espai personal: els ítems de grup no es poden moure. */
  onMove?: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onMarkVisited: (item: WishlistItem) => void;
}

export const WishlistCard: React.FC<Props> = ({ item, onCopy, onMove, onEdit, onDelete, onMarkVisited }) => {
  const confirm = useConfirm();

  return (
    <div
      className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs hover:border-amber-300 transition flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                {item.cuisine || 'Pendent'}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono">
                {item.priceRange || '—'}
              </span>
              {item.status === 'visited' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Ja provat!
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-stone-900">{item.restaurantName}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            {isInstagramHandle(item.instagram) && (
              <a
                href={instagramUrl(item.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-pink-600 transition"
                title={`Obrir @${item.instagram} a Instagram`}
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}
            {safeHttpUrl(item.link) && (
              <a
                href={safeHttpUrl(item.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                title="Obrir enllaç"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {item.address && (
          <div className="flex items-center justify-between gap-2 text-xs text-stone-500 mb-2">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.address}</span>
            </div>
            <a
              href={mapsUrl(item.restaurantName, item.address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-0.5 bg-stone-700 hover:bg-stone-800 text-white text-[11px] font-bold rounded-lg transition shrink-0"
            >
              Maps
            </a>
          </div>
        )}

        {item.recommendedBy && (
          <div className="text-xs text-amber-900 font-medium bg-amber-50/70 p-2 rounded-xl mb-2.5">
            💡 <strong>Recomanació:</strong> {item.recommendedBy}
          </div>
        )}

        {item.notes && (
          <p className="text-xs text-stone-600 mb-3 italic">
            "{item.notes}"
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-stone-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-stone-400">Proposat per:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopy(item)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition"
              title="Copiar a un grup"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {onMove && (
              <button
                onClick={() => onMove?.(item)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition"
                title="Moure a un grup"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => {
                if (await confirm({ message: 'Vols eliminar aquest desitjat?', confirmLabel: 'Eliminar', destructive: true })) {
                  onDelete(item.id);
                }
              }}
              className="text-xs text-stone-400 hover:text-red-600 px-2 py-1 rounded transition"
            >
              Eliminar
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <strong className="text-[12px] text-stone-600">{item.userName || 'Membre'}</strong>
          {item.status !== 'visited' && (
            <button
              onClick={() => onMarkVisited(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              title="Afegeix-lo directament a la llista de restaurants"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Visitat!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
