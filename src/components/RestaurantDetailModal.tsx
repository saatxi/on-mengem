import React from 'react';
import {
  X,
  Star,
  MapPin,
  Calendar,
  ExternalLink,
  Trash2,
  Share2,
  Copy,
  ArrowRightLeft,
  Pencil,
  Link2,
  Lock,
  Globe,
  Plus,
  ClipboardList,
  Dices,
} from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAlert, useConfirm } from './ConfirmDialog';
import { Restaurant, Visit } from '../types';
import { instagramUrl, isInstagramHandle, canEditVisit, isVisited, visitAverage, lastVisit, safeHttpUrl, mapsUrl } from '../utils/restaurantFields';
import { restaurantUrl } from '../utils/restaurantLink';
import { useAuth } from '../context/AuthContext';
import { useGroupMembers } from '../hooks/useGroupMembers';

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
  /** Només si s'ha obert amb «Sorprèn-me»: destaca el detall i permet tirar de nou. */
  onReroll?: () => void;
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
  onReroll,
  onEdit,
  onToggleFavorite,
  onDelete,
  onRegisterVisit,
  onDeleteVisit,
  onCopyToGroup,
  onMoveToGroup,
}) => {
  const { authUser, activeGroup, userProfile } = useAuth();
  const uid = authUser?.uid ?? '';
  const members = useGroupMembers(activeGroup ?? null);
  const confirm = useConfirm();
  const showAlert = useAlert();

  if (!restaurant) return null;

  const visited = isVisited(restaurant);
  const avgRating = visitAverage(restaurant);
  const last = lastVisit(restaurant);
  const visitCount = restaurant.visits.length;

  const handleShare = () => {
    const text = `T'agrada aquest restaurant? Descobreix "${restaurant.name}" (${restaurant.cuisine || 'Cuina'}) a On mengem?!`;
    const url = restaurantUrl(restaurant.id, window.location.origin);
    if (navigator.share) {
      navigator.share({ title: restaurant.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      showAlert('Enllaç copiat al porta-retalls!');
    }
  };

  const link = safeHttpUrl(restaurant.link);

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('ca', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <Modal label={`Detall de ${restaurant.name}`} onClose={onClose} size="lg" className={onReroll && 'border-beam'}>
      {/* Capçalera */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 pb-3 bg-surface/90 backdrop-blur-md border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-accent-soft text-orange-800">
              {restaurant.cuisine || 'Restaurant'}
            </span>
            {restaurant.priceRange && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">{restaurant.priceRange}</span>
            )}
            {visited && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">
                {visitCount === 1 ? '1 visita' : `${visitCount} visites`}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">{restaurant.name}</h2>
          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-stone-500">
            {restaurant.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <strong className="text-stone-800">{restaurant.rating.toFixed(1)}</strong> valoració
              </span>
            )}
            {avgRating != null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <strong className="text-stone-800">{avgRating.toFixed(1)}</strong> mitjana de les visites
              </span>
            )}
            {restaurant.rating == null && avgRating == null && <span>Sense valorar</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 -mr-2 shrink-0">
          <button
            onClick={() => onEdit(restaurant)}
            className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
            title="Editar restaurant"
            aria-label="Editar restaurant"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            aria-label="Tanca"
            className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {onReroll && (
          // La key torna a reproduir l'entrada cada vegada que el dau tria un altre restaurant
          <div key={restaurant.id} className="flex items-center justify-between gap-3 animate-scale-in">
            <p className="flex items-center gap-2 text-sm font-bold text-accent">
              <Dices className="w-4 h-4" />
              Avui toca anar aquí!
            </p>
            <Button onClick={onReroll} variant="secondary" size="sm">
              <Dices className="w-3.5 h-3.5" />
              Tornar a tirar
            </Button>
          </div>
        )}
        {/* Notes */}
        {restaurant.notes ? (
          <div className="p-4 rounded-2xl bg-accent-soft/70">
            <h3 className="text-xs font-semibold text-orange-900 mb-1">
              Notes i plats recomanats
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">{restaurant.notes}</p>
          </div>
        ) : null}

        {/* Adreça, links i telèfon */}
        <div className="space-y-2">
          {restaurant.address && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50">
              <div className="flex items-center gap-2.5 text-stone-700">
                <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm font-medium">{restaurant.address}</span>
              </div>
              <a
                href={mapsUrl(restaurant.name, restaurant.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover flex-shrink-0"
              >
                <span>Mapa</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {link && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50">
              <div className="flex items-center gap-2.5 text-stone-700 min-w-0">
                <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{link}</span>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover flex-shrink-0"
              >
                <span>Obrir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {isInstagramHandle(restaurant.instagram) && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50">
              <div className="flex items-center gap-2.5 text-stone-700">
                <InstagramIcon className="w-4 h-4 text-pink-500 flex-shrink-0" />
                <span className="text-sm font-medium">@{restaurant.instagram}</span>
              </div>
              <a
                href={instagramUrl(restaurant.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover flex-shrink-0"
              >
                <span>Obrir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

        </div>

        {/* Metadades */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
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
            className="py-3 px-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.96] transition-[background-color,transform]"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar visita</span>
          </button>

          <button
            onClick={() => onToggleFavorite(restaurant)}
            className={`py-3 px-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.96] transition-[background-color,transform] ${
              restaurant.favorite
                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-500/40'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Star className={`w-4 h-4 ${restaurant.favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{restaurant.favorite ? 'Als favorits' : 'Afegir a favorits'}</span>
          </button>
        </div>

        {(onCopyToGroup || onMoveToGroup) && (
          <div className="grid grid-cols-2 gap-2">
            {onCopyToGroup && (
              <button
                onClick={() => onCopyToGroup(restaurant)}
                className="py-3 px-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-[0.96] transition-[background-color,transform]"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar a un grup</span>
              </button>
            )}
            {onMoveToGroup && (
              <button
                onClick={() => onMoveToGroup(restaurant)}
                className="py-3 px-3 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-[0.96] transition-[background-color,transform]"
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
            onClick={async () => {
              if (await confirm({ message: 'Vols eliminar aquest restaurant?', details: 'També s\'esborraran totes les seves visites.', confirmLabel: 'Eliminar', destructive: true })) {
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
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                Visites ({visitCount})
              </h3>
              {last?.visitedOn && (
                <span className="text-xs text-stone-500">
                  Darrera: {formatDate(last.visitedOn)}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {restaurant.visits.map((v) => {
                const canEdit = canEditVisit(v, uid, activeGroup?.memberUids ?? []);
                const attendeeNames = v.attendeeIds
                  .map((id) => members[id]?.nickname ?? (id === uid ? (userProfile?.nickname || 'Tu') : null))
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-2xl bg-stone-50 space-y-1.5"
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
                          <span className="flex items-center gap-0.5 text-xs text-stone-500 font-semibold">
                            <Lock className="w-3 h-3" /> Privada
                          </span>
                        )}
                        {v.shared && restaurant.groupId && (
                          <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold">
                            <Globe className="w-3 h-3" /> Grupal
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => onRegisterVisit(restaurant, v)}
                            className="text-xs font-bold text-stone-500 hover:text-stone-800 transition"
                            title="Editar visita"
                            aria-label="Editar visita"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (await confirm({ message: 'Vols eliminar aquesta visita?', confirmLabel: 'Eliminar', destructive: true })) {
                                onDeleteVisit(v.id);
                              }
                            }}
                            className="text-xs font-bold text-red-400 hover:text-red-600 transition"
                            title="Eliminar visita"
                            aria-label="Eliminar visita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {v.notes && (
                      <p className="text-xs text-stone-600 leading-relaxed">{v.notes}</p>
                    )}
                    <div className="text-xs text-stone-500 flex flex-wrap gap-x-3 gap-y-0.5">
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
    </Modal>
  );
};
