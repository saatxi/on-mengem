import React, { useState } from 'react';
import { Star, Utensils, FileText, Link2, AlertTriangle } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { AddressField } from './AddressField';
import { Button } from './Button';
import { Modal, ModalHeader } from './Modal';
import { Restaurant } from '../types';
import { useAddressLocation } from '../hooks/useAddressLocation';
import {
  CUISINES,
  INSTAGRAM_INPUT_MESSAGE,
  normalizeText,
  INSTAGRAM_INPUT_PATTERN,
  PRICE_RANGES,
  optionOrEmpty,
  toInstagramHandle,
} from '../utils/restaurantFields';
import { FIELD, LABEL } from '../utils/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<Restaurant, 'id' | 'groupId' | 'createdBy' | 'createdByName' | 'visits' | 'createdAt' | 'updatedAt'>,
  ) => Promise<boolean>;
  // Si es passa, el formulari edita aquest restaurant en lloc de crear-ne un de nou
  restaurant?: Restaurant | null;
  /** Noms dels restaurants de l'espai, per avisar si se'n repeteix un en afegir-lo. */
  existingNames?: string[];
}

export const AddRestaurantModal: React.FC<Props> = ({ isOpen, onClose, onSave, restaurant, existingNames = [] }) => {
  const isEditing = !!restaurant;
  const [name, setName] = useState(restaurant?.name ?? '');
  // Cuina i preu són obligatoris i comencen buits: un valor que no és a la llista (o cap) obliga a triar-ne un
  const [cuisine, setCuisine] = useState(optionOrEmpty(CUISINES, restaurant?.cuisine));
  const [priceRange, setPriceRange] = useState(optionOrEmpty(PRICE_RANGES, restaurant?.priceRange));
  // Amb la població i la zona: sense, desar l'edició les esborraria
  const location = useAddressLocation({
    address: restaurant?.address,
    lat: restaurant?.lat,
    lng: restaurant?.lng,
    city: restaurant?.city,
    district: restaurant?.district,
  });
  const [rating, setRating] = useState<number | null>(restaurant?.rating ?? null);
  const [notes, setNotes] = useState(restaurant?.notes ?? '');
  const [link, setLink] = useState(restaurant?.link ?? '');
  const [instagram, setInstagram] = useState(restaurant?.instagram ? `@${restaurant.instagram}` : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isDuplicate = !isEditing && name.trim() !== '' && existingNames.some((n) => normalizeText(n) === normalizeText(name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !CUISINES.includes(cuisine) || !PRICE_RANGES.includes(priceRange)) return;

    setIsSubmitting(true);
    try {
      if (!(await location.readyToSave())) return;

      const ok = await onSave({
        name: name.trim().slice(0, 100),
        cuisine,
        priceRange,
        ...location.values,
        rating: rating ?? undefined,
        notes: notes.trim().slice(0, 500),
        link: link.trim().slice(0, 300),
        instagram: toInstagramHandle(instagram),
        // En editar no es toca el favorit: es commuta des de la targeta i el detall
        ...(isEditing ? {} : { favorite: false }),
      });
      if (ok) onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label={isEditing ? 'Editar restaurant' : 'Afegir restaurant'} onClose={onClose} size="lg">
      <ModalHeader title={isEditing ? 'Editar restaurant' : 'Afegir restaurant'} icon={Utensils} />

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {/* Nom */}
        <div>
          <label htmlFor="restaurant-name" className={LABEL}>
            Nom del restaurant *
          </label>
          <input
            id="restaurant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Can Vador, Bar del Pla, Xemei..."
            required
            maxLength={100}
            className={FIELD}
          />
          {isDuplicate && (
            <p role="status" className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              Ja hi ha un restaurant amb aquest nom en aquest espai.
            </p>
          )}
        </div>

        {/* Cuina i Preu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="restaurant-cuisine" className={LABEL}>
              Tipus de cuina *
            </label>
            <select id="restaurant-cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)} required className={FIELD}>
              <option value="" disabled>
                Tria una cuina...
              </option>
              {CUISINES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="restaurant-price" className={LABEL}>
              Nivell de preu *
            </label>
            <select id="restaurant-price" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} required className={FIELD}>
              <option value="" disabled>
                Tria un preu...
              </option>
              {PRICE_RANGES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AddressField id="restaurant-address" location={location} tone="restaurant" placeholder="Ex. Carrer de Provença, 120, Barcelona" />

        <div>
          <label htmlFor="restaurant-link" className={LABEL}>
            <Link2 className="w-3.5 h-3.5 text-stone-500" />
            Enllaç web o xarxes (opcional)
          </label>
          <input
            id="restaurant-link"
            type="url"
            pattern="https?://.*"
            title="Ha de començar per http:// o https://"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            maxLength={300}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="restaurant-instagram" className={LABEL}>
            <InstagramIcon className="w-3.5 h-3.5 text-stone-500" />
            Instagram (opcional)
          </label>
          <input
            id="restaurant-instagram"
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            onInvalid={(e) => e.currentTarget.setCustomValidity(INSTAGRAM_INPUT_MESSAGE)}
            onInput={(e) => e.currentTarget.setCustomValidity('')}
            pattern={INSTAGRAM_INPUT_PATTERN}
            placeholder="@nomdelrestaurant"
            maxLength={200}
            className={FIELD}
          />
        </div>

        {/* Puntuació */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span id="restaurant-rating-label" className="text-sm font-semibold text-stone-700">
              {rating !== null ? `Puntuació (${rating} de 5)` : 'Puntuació (sense valorar)'}
            </span>
            <div className="flex items-center gap-2">
              <div role="group" aria-labelledby="restaurant-rating-label" className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(rating === val ? null : val)}
                    aria-label={`${val} ${val === 1 ? 'estrella' : 'estrelles'}`}
                    className="rounded-full focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <Star
                      className={`w-4 h-4 cursor-pointer transition ${
                        rating !== null && rating >= val ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-xs text-stone-500 hover:text-stone-600 transition"
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
              aria-labelledby="restaurant-rating-label"
              min="1"
              max="5"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="restaurant-notes" className={LABEL}>
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            Notes i recomanacions de plats
          </label>
          <textarea
            id="restaurant-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. Demanar el tàrtar de tonyina i els bunyols de bacallà. Atenció de 10!"
            maxLength={500}
            className={FIELD}
          />
        </div>

        {/* Botons */}
        <div className="flex gap-2 pt-3">
          <Button type="button" onClick={onClose} variant="secondary" size="lg" className="flex-1">
            Cancel·lar
          </Button>
          <Button type="submit" disabled={isSubmitting || !name.trim()} variant="primary" size="lg" className="flex-1">
            {isSubmitting ? 'Guardant...' : isEditing ? 'Desar canvis' : 'Afegir restaurant'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
