import React, { useState, useEffect } from 'react';
import { X, Calendar, Star, FileText, Users, Lock, Globe } from 'lucide-react';
import { Modal } from './Modal';
import { Restaurant, Visit } from '../types';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useAuth } from '../context/AuthContext';
import { localToday } from '../utils/restaurantFields';

interface Props {
  restaurant: Restaurant | null;
  visit?: Visit | null; // null = nova visita, Visit = editar
  onClose: () => void;
  onSave: (
    restaurantId: string,
    visitedOn: string | undefined,
    rating: number | undefined,
    notes: string,
    attendeeIds: string[],
    shared: boolean,
    visitId?: string,
  ) => Promise<boolean>;
}

export const VisitModal: React.FC<Props> = ({ restaurant, visit, onClose, onSave }) => {
  const { authUser, activeGroup } = useAuth();
  const uid = authUser?.uid ?? '';
  const members = useGroupMembers(activeGroup ?? null);
  const isEditing = !!visit;
  const isGroup = restaurant?.groupId != null;

  const today = localToday();

  const [visitedOn, setVisitedOn] = useState<string>(visit?.visitedOn ?? today);
  const [unknownDate, setUnknownDate] = useState<boolean>(!visit?.visitedOn && isEditing);
  const [rating, setRating] = useState<number>(visit?.rating ?? 0);
  const [notes, setNotes] = useState<string>(visit?.notes ?? '');
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    visit?.attendeeIds.length ? visit.attendeeIds : uid ? [uid] : [],
  );
  const [shared, setShared] = useState<boolean>(visit?.shared ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setVisitedOn(visit?.visitedOn ?? today);
    setUnknownDate(!visit?.visitedOn && !!visit);
    setRating(visit?.rating ?? 0);
    setNotes(visit?.notes ?? '');
    setAttendeeIds(visit?.attendeeIds?.length ? visit.attendeeIds : uid ? [uid] : []);
    setShared(visit?.shared ?? true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, visit?.id]);

  if (!restaurant) return null;

  // L'usuari pot canviar «shared» si és nova visita o n'és l'autor.
  const canToggleShared = !isEditing || !visit?.createdBy || visit.createdBy === uid;

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ok = await onSave(
        restaurant.id,
        unknownDate ? undefined : visitedOn || undefined,
        rating > 0 ? rating : undefined,
        notes.trim(),
        attendeeIds,
        shared,
        isEditing ? visit.id : undefined,
      );
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label={isEditing ? 'Editar visita' : 'Registrar visita'} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
        <div>
          <h2 className="text-base font-bold">{isEditing ? 'Editar visita' : 'Registrar visita'}</h2>
          <p className="text-xs text-emerald-100 font-medium mt-0.5 truncate max-w-[240px]">{restaurant.name}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Tanca"
          className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Data */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            Data de la visita
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={unknownDate}
                onChange={(e) => setUnknownDate(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              Data desconeguda
            </label>
            {!unknownDate && (
              <input
                type="date"
                value={visitedOn}
                max={today}
                onChange={(e) => setVisitedOn(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition"
              />
            )}
          </div>
        </div>

        {/* Valoració */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
            Valoració {rating > 0 ? `(${rating} / 5)` : '(opcional)'}
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRating(rating === val ? 0 : val)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 transition ${
                    rating >= val ? 'fill-amber-400 text-amber-500' : 'text-stone-300 hover:text-amber-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            Notes (opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Impressions, plats provats, per repetir..."
            maxLength={1000}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-800 focus:border-emerald-500 outline-hidden"
          />
        </div>

        {/* Assistents (només en grups) */}
        {isGroup && Object.keys(members).length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              Qui hi va anar
            </label>
            <div className="space-y-1.5">
              {Object.entries(members).map(([id, info]) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={attendeeIds.includes(id)}
                    onChange={() => toggleAttendee(id)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-lg leading-none">{info.avatar}</span>
                  <span className="text-sm text-stone-800 font-medium">
                    {info.nickname}{id === uid ? ' (Tu)' : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Grupal / privada (només en grups) */}
        {isGroup && canToggleShared && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">Visibilitat</p>
            <div className="flex rounded-xl border border-stone-200 overflow-hidden text-xs font-bold">
              <button
                type="button"
                onClick={() => setShared(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition ${
                  shared ? 'bg-emerald-600 text-white' : 'bg-surface text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Grupal
              </button>
              <button
                type="button"
                onClick={() => setShared(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition border-l border-stone-200 ${
                  !shared ? 'bg-stone-700 text-white' : 'bg-surface text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Privada
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-stone-400">
              {shared
                ? 'Tothom del grup la pot editar i esborrar.'
                : 'Tothom del grup la veu, però només tu la pots editar.'}
            </p>
          </div>
        )}

        {/* Botons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Guardant...' : isEditing ? 'Desar canvis' : 'Registrar visita'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
