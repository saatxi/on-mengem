import { GroupChange, GroupChangeItemType, WishlistStatus } from '../types';

// Noms dels camps que desa l'historial (history_fields a supabase/migrations/0001_schema.sql)
const FIELD_LABELS: Record<GroupChangeItemType, Record<string, string>> = {
  restaurant: {
    name: 'Nom',
    cuisine: 'Cuina',
    price_range: 'Preu',
    address: 'Adreça',
    rating: 'Valoració',
    notes: 'Notes',
    link: 'Enllaç',
    instagram: 'Instagram',
    favorite: 'Favorit',
  },
  wishlist: {
    restaurant_name: 'Nom',
    cuisine: 'Cuina',
    price_range: 'Preu',
    recommended_by: 'Recomanat per',
    address: 'Adreça',
    notes: 'Notes',
    link: 'Enllaç',
    instagram: 'Instagram',
    status: 'Estat',
  },
  visit: {
    visited_on: 'Data',
    rating: 'Valoració',
    notes: 'Notes',
    shared: 'Visibilitat',
    attendees: 'Assistents',
  },
};

const STATUS_LABELS: Record<WishlistStatus, string> = { pending: 'Pendent', planned: 'Planificat', visited: 'Provat' };

const ITEM_LABELS: Record<GroupChangeItemType, string> = {
  restaurant: 'el restaurant',
  wishlist: 'el desitjat',
  visit: 'una visita a',
};

/** Textos llargs (notes) es retallen perquè la línia de l'historial no s'allargui massa. */
const MAX_TEXT_LENGTH = 80;

const EMPTY = '—';

export interface FieldChange {
  label: string;
  before: string;
  after: string;
}

/** «Joan ha editat el restaurant «Can Pep»». */
export const changeTitle = (change: GroupChange): string => {
  const who = change.changedByName ?? 'Algú';
  const verb = change.action === 'delete' ? 'ha esborrat' : 'ha editat';
  return `${who} ${verb} ${ITEM_LABELS[change.itemType]} «${change.itemName ?? 'sense nom'}»`;
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('ca', { day: 'numeric', month: 'short', year: 'numeric' });

/** Valor d'un camp tal com es mostra; `nameOf` tradueix els identificadors d'usuari (assistents) a noms. */
export const formatFieldValue = (field: string, value: unknown, nameOf: (uid: string) => string): string => {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (field === 'favorite') return value ? 'Sí' : 'No';
  if (field === 'shared') return value ? 'Grupal' : 'Privada';
  if (field === 'rating') return `${Number(value).toLocaleString('ca')} ★`;
  if (field === 'status') return STATUS_LABELS[value as WishlistStatus] ?? String(value);
  if (field === 'visited_on' && typeof value === 'string') return formatDate(value);
  if (field === 'instagram') return `@${value}`;
  if (Array.isArray(value)) return value.length ? value.map((uid) => nameOf(String(uid))).join(', ') : EMPTY;
  const text = String(value);
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
};

/** Camps d'una edició, abans i després, en l'ordre del formulari. Un esborrat no en té. */
export const fieldChanges = (change: GroupChange, nameOf: (uid: string) => string): FieldChange[] => {
  if (change.action !== 'update' || !change.newData) return [];
  const labels = FIELD_LABELS[change.itemType];
  return Object.keys(labels)
    .filter((field) => field in change.oldData)
    .map((field) => ({
      label: labels[field],
      before: formatFieldValue(field, change.oldData[field], nameOf),
      after: formatFieldValue(field, change.newData?.[field], nameOf),
    }));
};

/** Resum de què es recupera en desfer un esborrat («Amb 2 visites», «Visita del 3 d’oct. del 2026 · 4 ★»). */
export const deletedSummary = (change: GroupChange): string | null => {
  if (change.action !== 'delete') return null;
  const data = change.oldData;
  if (change.itemType === 'restaurant') {
    const visits = Array.isArray(data.visits) ? data.visits.length : 0;
    if (visits === 0) return null;
    return visits === 1 ? 'Amb 1 visita' : `Amb ${visits} visites`;
  }
  if (change.itemType === 'visit') {
    const parts = [
      typeof data.visited_on === 'string' ? `Visita del ${formatDate(data.visited_on)}` : 'Visita sense data',
      data.rating != null ? formatFieldValue('rating', data.rating, String) : null,
      data.shared === false ? 'Privada' : null,
    ];
    return parts.filter(Boolean).join(' · ');
  }
  return null;
};
