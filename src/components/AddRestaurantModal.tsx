import React, { useState } from 'react';
import { X, Star, Utensils, MapPin, DollarSign, FileText, Link2, Instagram } from 'lucide-react';
import { Restaurant } from '../types';
import {
  CUISINES,
  INSTAGRAM_INPUT_MESSAGE,
  INSTAGRAM_INPUT_PATTERN,
  toInstagramHandle,
} from '../utils/restaurantFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Restaurant, 'id' | 'groupId' | 'createdBy' | 'createdByName' | 'visits' | 'createdAt' | 'updatedAt'>, createVisitToday?: boolean) => Promise<boolean>;
  // Si es passa, el formulari edita aquest restaurant en lloc de crear-ne un de nou
  restaurant?: Restaurant | null;
}

export const AddRestaurantModal: React.FC<Props> = ({ isOpen, onClose, onSave, restaurant }) => {
  const isEditing = !!restaurant;
  // Una cuina que ja no és a la llista obliga a triar-ne una de nova
  const initialCuisine = isEditing ? restaurant.cuisine ?? '' : 'Mediterrània';

  const [name, setName] = useState(restaurant?.name ?? '');
  const [cuisine, setCuisine] = useState(CUISINES.includes(initialCuisine) ? initialCuisine : '');
  const [priceRange, setPriceRange] = useState(restaurant?.priceRange || '10-20 €');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [rating, setRating] = useState<number | null>(restaurant?.rating ?? null);
  const [notes, setNotes] = useState(restaurant?.notes ?? '');
  const [link, setLink] = useState(restaurant?.link ?? '');
  const [instagram, setInstagram] = useState(restaurant?.instagram ? `@${restaurant.instagram}` : '');
  const visitedToday = false;
  const favorite = restaurant?.favorite ?? false;
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !CUISINES.includes(cuisine)) return;

    setIsSubmitting(true);
    try {
      const ok = await onSave(
        {
          name: name.trim().slice(0, 100),
          cuisine,
          priceRange,
          address: address.trim().slice(0, 200),
          rating: rating ?? undefined,
          notes: notes.trim().slice(0, 500),
          link: link.trim().slice(0, 300),
          instagram: toInstagramHandle(instagram),
          favorite,
        },
        !isEditing && visitedToday,
      );
      if (ok) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-orange-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            <h2 className="text-base font-bold">{isEditing ? 'Editar restaurant' : 'Afegir Nou Restaurant'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-orange-200 hover:text-white hover:bg-orange-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Nom */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Nom del restaurant *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Can Vador, Bar del Pla, Xemei..."
              required
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-stone-900 text-sm font-medium outline-hidden transition"
            />
          </div>

          {/* Cuina i Preu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Tipus de cuina
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-medium focus:border-orange-500 outline-hidden transition"
              >
                <option value="" disabled>Tria una cuina...</option>
                {CUISINES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Nivell de preu
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-stone-900 outline-hidden transition px-3 py-2.5"
              >
                {['1-10 €', '10-20 €', '20-30 €', '30-40 €', '40-50 €', '50 € o més'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Adreça */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              Adreça (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex. Carrer de Provença, 120, Barcelona"
              maxLength={200}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-stone-400" />
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
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5 text-stone-400" />
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
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
            />
          </div>

          {/* Puntuació */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                {rating !== null ? `Puntuació (${rating} de 5)` : 'Puntuació (sense valorar)'}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Star
                      key={val}
                      className={`w-4 h-4 cursor-pointer transition ${
                        rating !== null && rating >= val ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                      }`}
                      onClick={() => setRating(rating === val ? null : val)}
                    />
                  ))}
                </div>
                {rating !== null && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="text-[10px] text-stone-400 hover:text-stone-600 transition"
                    title="Treure puntuació"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {rating !== null && (
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full accent-orange-600"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              Notes i recomanacions de plats
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. Demanar el tàrtar de tonyina i els bunyols de bacallà. Atenció de 10!"
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
            />
          </div>

          {/* Botons */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white shadow-md disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Guardant...' : isEditing ? 'Desar canvis' : 'Afegir Restaurant'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};
