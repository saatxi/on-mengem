import React, { useState } from 'react';
import { X, BookmarkPlus, Link2, UserCheck, Utensils, DollarSign, MessageSquare, Instagram } from 'lucide-react';
import { WishlistItem } from '../types';
import {
  CUISINES,
  INSTAGRAM_INPUT_MESSAGE,
  INSTAGRAM_INPUT_PATTERN,
  toInstagramHandle,
} from '../utils/restaurantFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Omit<WishlistItem, 'id' | 'groupId' | 'userId' | 'userName' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const AddWishlistModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisine, setCuisine] = useState('Mediterrània');
  const [priceRange, setPriceRange] = useState('€€');
  const [recommendedBy, setRecommendedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        restaurantName: restaurantName.trim().slice(0, 100),
        cuisine,
        priceRange,
        recommendedBy: recommendedBy.trim().slice(0, 80),
        notes: notes.trim().slice(0, 500),
        link: link.trim().slice(0, 300),
        instagram: toInstagramHandle(instagram),
        status: 'pending',
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
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-white">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5" />
            <h2 className="text-base font-bold">Proposar Lloc Desitjat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-amber-100 hover:text-white hover:bg-amber-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Nom del restaurant pendent *
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
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-800 focus:border-amber-500 outline-hidden"
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
              <div className="grid grid-cols-4 gap-1">
                {['€', '€€', '€€€', '€€€€'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceRange(p)}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      priceRange === p
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-stone-400" />
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
              <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
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
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-amber-500 outline-hidden"
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
              {isSubmitting ? 'Guardant...' : 'Afegir a Desitjats'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
