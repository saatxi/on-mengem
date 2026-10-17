import React from 'react';
import {
  X,
  Star,
  MapPin,
  Phone,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCircle,
  Share2,
  Copy,
  ArrowRightLeft,
  Pencil
} from 'lucide-react';
import { Restaurant } from '../types';

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  onToggleFavorite: (r: Restaurant) => void;
  onToggleVisited: (r: Restaurant) => void;
  onDelete: (id: string) => void;
  onEdit: (r: Restaurant) => void;
  onCopyToGroup?: (r: Restaurant) => void;
  onMoveToGroup?: (r: Restaurant) => void;
}

export const RestaurantDetailModal: React.FC<Props> = ({
  restaurant,
  onClose,
  onToggleFavorite,
  onToggleVisited,
  onDelete,
  onEdit,
  onCopyToGroup,
  onMoveToGroup,
}) => {
  if (!restaurant) return null;

  const handleShare = () => {
    const text = `T'agrada aquest restaurant? Descobreix "${restaurant.name}" (${restaurant.cuisine || 'Cuina'}) a On menjem?!`;
    if (navigator.share) {
      navigator.share({ title: restaurant.name, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${window.location.href}`);
      alert('Enllaç copiat al porta-retalls!');
    }
  };

  const mapsQuery = encodeURIComponent(
    [restaurant.name, restaurant.address, restaurant.city].filter(Boolean).join(', ')
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                  {restaurant.cuisine || 'Restaurant'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold font-mono">
                  {restaurant.priceRange || '€€'}
                </span>
                {restaurant.visited && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-xs font-bold">
                    Visitat
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{restaurant.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(restaurant)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition"
                title="Editar restaurant"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-orange-100">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span className="text-white font-bold text-sm">{restaurant.rating?.toFixed(1) || '4.0'}</span>
              <span>/ 5</span>
            </div>
            {restaurant.city && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{restaurant.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Notes */}
          {restaurant.notes ? (
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-900 mb-1">
                Notes & Recomanacions de plats
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed italic">
                "{restaurant.notes}"
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-500">
              Cap nota addicional afegida encara.
            </div>
          )}

          {/* Adreça i Telèfon */}
          <div className="space-y-2.5 text-sm">
            {(restaurant.address || restaurant.city) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-2.5 text-stone-700">
                  <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span className="text-xs font-medium">
                    {[restaurant.address, restaurant.city].filter(Boolean).join(', ')}
                  </span>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  <span>Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {restaurant.phone && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-2.5 text-stone-700">
                  <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-mono font-medium">{restaurant.phone}</span>
                </div>
                <a
                  href={`tel:${restaurant.phone}`}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Trucar
                </a>
              </div>
            )}
          </div>

          {/* Metadades */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Afegit per: <strong className="text-stone-600">{restaurant.createdByName || 'Membre del grup'}</strong></span>
            {restaurant.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(restaurant.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Accions principals */}
          <div className="pt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleVisited(restaurant)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                restaurant.visited
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{restaurant.visited ? 'Visitat ✓' : 'Marcar visitat'}</span>
            </button>

            <button
              onClick={() => onToggleFavorite(restaurant)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                restaurant.favorite
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Star className={`w-4 h-4 ${restaurant.favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{restaurant.favorite ? 'Preferit ★' : 'Afegir a favorits'}</span>
            </button>
          </div>

          {(onCopyToGroup || onMoveToGroup) && (
            <div className="grid grid-cols-2 gap-2">
              {onCopyToGroup && (
                <button
                  onClick={() => onCopyToGroup(restaurant)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar a un grup</span>
                </button>
              )}
              {onMoveToGroup && (
                <button
                  onClick={() => onMoveToGroup(restaurant)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 transition"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Moure a un grup</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Vols eliminar aquest restaurant?')) {
                  onDelete(restaurant.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
