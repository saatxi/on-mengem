import React, { useState } from 'react';
import { X, BookmarkPlus, Link2, UserCheck, MessageSquare, MapPin } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { Modal } from './Modal';
import { WishlistItem } from '../types';
import {
  CUISINES,
  DEFAULT_PRICE_RANGE,
  INSTAGRAM_INPUT_MESSAGE,
  INSTAGRAM_INPUT_PATTERN,
  PRICE_RANGES,
  toInstagramHandle,
} from '../utils/restaurantFields';

export type WishlistFormData = Omit<WishlistItem, 'id' | 'groupId' | 'userId' | 'userName' | 'createdAt' | 'updatedAt'>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Retorna cert si s'ha desat; si no, el formulari es manté obert. */
  onSave: (data: WishlistFormData) => Promise<boolean>;
  // Si es passa, el formulari edita aquest desitjat en lloc de crear-ne un de nou
  item?: WishlistItem | null;
}

// L'estat inicial surt de `item`: el pare canvia la `key` per tornar a muntar el formulari net en cada obertura.
export const WishlistModal: React.FC<Props> = ({ isOpen, onClose, onSave, item }) => {
  const isEditing = !!item;
  const [restaurantName, setRestaurantName] = useState(item?.restaurantName ?? '');
  const [cuisine, setCuisine] = useState(item?.cuisine || 'Mediterrània');
  const [priceRange, setPriceRange] = useState(item?.priceRange || DEFAULT_PRICE_RANGE);
  const [recommendedBy, setRecommendedBy] = useState(item?.recommendedBy ?? '');
  const [address, setAddress] = useState(item?.address ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [link, setLink] = useState(item?.link ?? '');
  const [instagram, setInstagram] = useState(item?.instagram ? `@${item.instagram}` : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await onSave({
        restaurantName: restaurantName.trim().slice(0, 100),
        cuisine,
        priceRange,
        recommendedBy: recommendedBy.trim().slice(0, 80),
        address: address.trim().slice(0, 200),
        notes: notes.trim().slice(0, 500),
        link: link.trim().slice(0, 300),
        instagram: toInstagramHandle(instagram),
        // En editar no es toca l'estat (pendent, planificat o visitat)
        ...(isEditing ? {} : { status: 'pending' as const }),
      });
      if (ok) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label={isEditing ? 'Editar desitjat' : 'Proposar desitjat'} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-white">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="w-5 h-5" />
          <h2 className="text-base font-bold">{isEditing ? 'Editar Desitjat' : 'Proposar Lloc Desitjat'}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Tanca"
          className="p-1.5 rounded-full text-amber-100 hover:text-white hover:bg-amber-600 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
            {isEditing ? 'Nom del restaurant *' : 'Nom del restaurant pendent *'}
          </label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Ex. Gresca, Suculent, Bar Brutal..."
            required
            maxLength={100}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-900 text-sm font-medium outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Cuina
            </label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-surface text-sm text-stone-800 focus:border-amber-500 outline-hidden"
            >
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Preu estimat
            </label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-stone-900 outline-hidden transition px-3 py-2.5"
            >
              {PRICE_RANGES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-stone-500" />
            Qui ho ha recomanat?
          </label>
          <input
            type="text"
            value={recommendedBy}
            onChange={(e) => setRecommendedBy(e.target.value)}
            placeholder="Ex. El meu cosí, Guia Michelin, TikTok..."
            maxLength={80}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-stone-500" />
            Adreça (opcional)
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex. Carrer de Provença 88, Barcelona"
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
            Motiu / Per què hi volem anar?
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. Diuen que fan el millor pastís de formatge de la ciutat i tenen un menú degustació assequible."
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-stone-500" />
            Enllaç web o xarxes (opcional)
          </label>
          <input
            type="url"
            pattern="https?://.*"
            title="Ha de començar per http:// o https://"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            maxLength={300}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
            <InstagramIcon className="w-3.5 h-3.5 text-stone-500" />
            Instagram (opcional)
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            onInvalid={(e) => e.currentTarget.setCustomValidity(INSTAGRAM_INPUT_MESSAGE)}
            onInput={(e) => e.currentTarget.setCustomValidity('')}
            pattern={INSTAGRAM_INPUT_PATTERN}
            placeholder="@nomdelrestaurant"
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !restaurantName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-md disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Guardant...' : isEditing ? 'Desar canvis' : 'Afegir a Desitjats'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
