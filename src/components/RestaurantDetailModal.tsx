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
  Pencil,
  Link2,
  Instagram,
  Lock,
  Globe,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { Restaurant, Visit } from '../types';
import { instagramUrl, isInstagramHandle, canEditVisit, isVisited, visitAverage, lastVisit } from '../utils/restaurantFields';
import { useAuth } from '../context/AuthContext';
import { useGroupMembers } from '../hooks/useGroupMembers';

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  onEdit: (r: Restaurant) => void;
  onToggleFavorite: (r: Restaurant) => void;
  onDelete: (id: string) => void;
  onRegisterVisit: (r: Restaurant, v?: Visit) => void;
  onDeleteVisit: (visitId: string) => void;
  onCopyToGroup?: (r: Restaurant) => void;
  onMoveToGroup?: (r: Restaurant) => void;
}

export const RestaurantDetailModal: React.FC<Props> = ({
  restaurant,
  onClose,
  onEdit,
  onToggleFavorite,
  onDelete,
  onRegisterVisit,
  onDeleteVisit,
  onCopyToGroup,
  onMoveToGroup,
}) => {
  const { authUser, activeGroup } = useAuth();
  const uid = authUser?.uid ?? '';
  const members = useGroupMembers(activeGroup ?? null);

  if (!restaurant) return null;

  const visited = isVisited(restaurant);
  const avgRating = visitAverage(restaurant);
  const last = lastVisit(restaurant);
  const visitCount = restaurant.visits.length;

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

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('ca', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                  {restaurant.cuisine || 'Restaurant'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold font-mono">
                  {restaurant.priceRange || '€€'}
                </span>
                {visited && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-xs font-bold">
                    {visitCount === 1 ? '1 visita' : `${visitCount} visites`}
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
            {avgRating != null && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span>Nota visites: <strong className="text-white">{avgRating.toFixed(1)}</strong></span>
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
              <p className="text-sm text-stone-700 leading-relaxed">{restaurant.notes}</p>
            </div>
          ) : null}

          {/* Adreça, links i telèfon */}
          <div className="space-y-2">
            {restaurant.address && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-2.5 text-stone-700">
                  <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span className="text-xs font-medium">{restaurant.address}</span>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition flex-shrink-0"
                >
                  Maps
                </a>
              </div>
            )}

            {restaurant.link && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-2.5 text-stone-700 min-w-0">
                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{restaurant.link}</span>
                </div>
                <a
                  href={restaurant.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 flex-shrink-0"
                >
                  <span>Obrir</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {isInstagramHandle(restaurant.instagram) && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <div className="flex items-center gap-2.5 text-stone-700">
                  <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                  <span className="text-xs font-medium">@{restaurant.instagram}</span>
                </div>
                <a
                  href={instagramUrl(restaurant.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 flex-shrink-0"
                >
                  <span>Obrir</span>
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
              onClick={() => onRegisterVisit(restaurant)}
              className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar visita</span>
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

          {/* Historial de visites */}
          {visitCount > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                  Visites ({visitCount})
                </h3>
                {last?.visitedOn && (
                  <span className="text-[11px] text-stone-400">
                    Darrera: {formatDate(last.visitedOn)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {restaurant.visits.map((v) => {
                  const canEdit = canEditVisit(v, uid);
                  const attendeeNames = v.attendeeIds
                    .map((id) => members[id]?.nickname ?? id)
                    .join(', ');

                  return (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-stone-700">
                            {v.visitedOn ? formatDate(v.visitedOn) : 'Data desconeguda'}
                          </span>
                          {v.rating != null && v.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600 font-bold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {v.rating}
                            </span>
                          )}
                          {!v.shared && (
                            <span className="flex items-center gap-0.5 text-[10px] text-stone-500 font-semibold">
                              <Lock className="w-3 h-3" /> Privada
                            </span>
                          )}
                          {v.shared && restaurant.groupId && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold">
                              <Globe className="w-3 h-3" /> Grupal
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => onRegisterVisit(restaurant, v)}
                              className="text-[11px] font-bold text-stone-500 hover:text-stone-800 transition"
                              title="Editar visita"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Vols eliminar aquesta visita?')) onDeleteVisit(v.id);
                              }}
                              className="text-[11px] font-bold text-red-400 hover:text-red-600 transition"
                              title="Eliminar visita"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {v.notes && (
                        <p className="text-xs text-stone-600 leading-relaxed">{v.notes}</p>
                      )}
                      <div className="text-[11px] text-stone-400 flex flex-wrap gap-x-3 gap-y-0.5">
                        {v.createdByName && (
                          <span>Per: <strong className="text-stone-500">{v.createdByName}</strong></span>
                        )}
                        {attendeeNames && (
                          <span>Assistents: <strong className="text-stone-500">{attendeeNames}</strong></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
