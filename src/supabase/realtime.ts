import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';

/** Taules que avisen dels seus canvis (trigger broadcast_changes a supabase/migrations/0001_schema.sql). */
export type ChangedTable =
  | 'restaurants'
  | 'restaurant_visits'
  | 'wishlist'
  | 'alerts'
  | 'group_changes'
  | 'groups'
  | 'group_members'
  | 'profiles';

type Listener = (table: ChangedTable) => void;

interface Subscription {
  listeners: Set<Listener>;
  channel: Promise<RealtimeChannel>;
}

// supabase.channel() retorna el canal existent si el topic ja hi és: els hooks que escolten el mateix topic
// (p. ex. les dades i l'historial d'un grup) comparteixen el canal, i només es tanca quan ja no l'escolta ningú.
const subscriptions = new Map<string, Subscription>();
// Canals que s'estan tancant: el client els treu de la llista quan el servidor ho confirma, i fins llavors
// supabase.channel() retornaria el canal que es tanca. Un canal nou del mateix topic s'obre després.
const closing = new Map<string, Promise<unknown>>();

const openChannel = async (topic: string, listeners: Set<Listener>) => {
  await closing.get(topic);
  return supabase
    .channel(topic, { config: { private: true } })
    .on('broadcast', { event: 'change' }, ({ payload }) => {
      listeners.forEach((notify) => notify(payload.table as ChangedTable));
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') console.error(`[Realtime] ${topic}:`, err);
    });
};

/**
 * Escolta els avisos de canvis d'un canal privat: `group:<id>` (contingut del grup) o `user:<id>` (espai personal,
 * perfil i grups propis). L'avís només diu quina taula ha canviat; qui escolta torna a llegir les dades.
 * Retorna la funció per deixar d'escoltar.
 */
export function subscribeToChanges(topic: string, listener: Listener): () => void {
  let subscription = subscriptions.get(topic);
  if (!subscription) {
    const listeners = new Set<Listener>();
    subscription = { listeners, channel: openChannel(topic, listeners) };
    subscriptions.set(topic, subscription);
  }

  const current = subscription;
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    subscriptions.delete(topic);
    const closed = current.channel.then((channel) => supabase.removeChannel(channel));
    closing.set(topic, closed);
    closed.finally(() => {
      if (closing.get(topic) === closed) closing.delete(topic);
    });
  };
}
