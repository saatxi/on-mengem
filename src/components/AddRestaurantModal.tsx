import React, { useState } from 'react';
import { X, Star, Utensils, MapPin, Phone, DollarSign, FileText, Link2, Instagram } from 'lucide-react';
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
  onSave: (data: Omit<Restaurant, 'id' | 'groupId' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  // Si es passa, el formulari edita aquest restaurant en lloc de crear-ne un de nou
  restaurant?: Restaurant | null;
}

export const AddRestaurantModal: React.FC<Props> = ({ isOpen, onClose, onSave, restaurant }) => {
  const isEditing = !!restaurant;
  const initialCuisine = restaurant?.cuisine;
  const isKnownCuisine = !initialCuisine || CUISINES.includes(initialCuisine);

  const [name, setName] = useState(restaurant?.name ?? '');
  const [cuisine, setCuisine] = useState(isKnownCuisine ? initialCuisine || 'Mediterrània' : 'Altra');
  const [customCuisine, setCustomCuisine] = useState(isKnownCuisine ? '' : initialCuisine);
  const [priceRange, setPriceRange] = useState(restaurant?.priceRange || '€€');
  const [city, setCity] = useState(restaurant?.city ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [rating, setRating] = useState(restaurant?.rating ?? 4.5);
  const [notes, setNotes] = useState(restaurant?.notes ?? '');
  const [link, setLink] = useState(restaurant?.link ?? '');
  const [instagram, setInstagram] = useState(restaurant?.instagram ? `@${restaurant.instagram}` : '');
  const [visited, setVisited] = useState(restaurant?.visited ?? true);
  const [favorite, setFavorite] = useState(restaurant?.favorite ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const finalCuisine = cuisine === 'Altra' ? customCuisine.trim() || 'Variada' : cuisine;
      await onSave({
        name: name.trim().slice(0, 100),
        cuisine: finalCuisine.slice(0, 60),
        priceRange,
        city: city.trim().slice(0, 80),
        address: address.trim().slice(0, 200),
        phone: phone.trim().slice(0, 30),
        rating,
        notes: notes.trim().slice(0, 500),
        link: link.trim().slice(0, 300),
        instagram: toInstagramHandle(instagram),
        visited,
        favorite,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-orange-600 text-white">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-medium focus:border-orange-500 outline-hidden transition"
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {cuisine === 'Altra' && (
                <input
                  type="text"
                  value={customCuisine}
                  onChange={(e) => setCustomCuisine(e.target.value)}
                  placeholder="Especifica la cuina..."
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Nivell de preu
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {['€', '€€', '€€€', '€€€€'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceRange(p)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      priceRange === p
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ubicació */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                Població / Barri
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. Barcelona / Born, Girona..."
                maxLength={80}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                Telèfon reserves
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex. 93 123 45 67"
                maxLength={30}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-orange-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Adreça exacta (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex. Carrer de Provença, 120"
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
                Puntuació ({rating} de 5)
              </label>
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((val) => (
                  <Star
                    key={val}
                    className={`w-4 h-4 cursor-pointer transition ${
                      rating >= val ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                    }`}
                    onClick={() => setRating(val)}
                  />
                ))}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full accent-orange-600"
            />
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

          {/* Checkboxes */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={visited}
                onChange={(e) => setVisited(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <span>Ja l'hem visitat</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Preferit del grup
              </span>
            </label>
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
  );
};
