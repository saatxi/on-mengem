import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase/client';
import {
  toRestaurant,
  toWishlistItem,
  toAlert,
  restaurantToRow,
  wishlistToRow,
} from '../supabase/mappers';
import { quotaErrorMessage } from '../supabase/errors';
import { subscribeToChanges, type ChangedTable } from '../supabase/realtime';
import { useAuth } from '../context/AuthContext';
import { localToday } from '../utils/restaurantFields';
import { geocodeAddress, type Coordinates } from '../utils/geocode';
import { Restaurant, WishlistItem, Alert } from '../types';

function logError(action: string, error: unknown) {
  console.error(`[Supabase] ${action}:`, error);
}

const ERROR_MESSAGE = 'No s\'ha pogut completar l\'acció. Comprova la connexió i torna-ho a provar.';
/** Els canvis ràpids consecutius (p. ex. una còpia a varis grups) es resolen amb un sol refresc. */
const REFRESH_DEBOUNCE_MS = 300;

/** Columnes de coordenades d'una adreça; sense adreça o sense resultat, el restaurant queda fora del mapa. */
const coordinateColumns = (coords: Coordinates | null) => ({ lat: coords?.lat ?? null, lng: coords?.lng ?? null });

/**
 * Dades de l'espai actiu: el grup seleccionat o, si no n'hi ha cap,
 * l'espai personal de l'usuari (group_id = NULL).
 */
export function useRealtimeData() {
  const { authUser, userProfile, activeGroup } = useAuth();
  const uid = authUser?.uid;
  const groupId = activeGroup?.id ?? null;
  const isPersonal = groupId === null;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Espai actiu: les respostes d'un espai anterior es descarten (evita barrejar dades en canviar de grup).
  const scope = `${uid}:${groupId ?? 'personal'}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const fail = (action: string, err: unknown) => {
    logError(action, err);
    setError(quotaErrorMessage(err) ?? ERROR_MESSAGE);
  };
  const clearError = useCallback(() => setError(null), []);

  const fetchRestaurants = useCallback(async () => {
    if (!uid) return;
    let q = supabase
      .from('restaurants')
      .select('*, restaurant_visits(*, visit_attendees(user_id))')
      .order('created_at', { ascending: false });
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null).eq('created_by', uid);
    const { data, error } = await q;
    if (scopeRef.current !== scope) return;
    if (error) return fail('restaurants', error);
    setRestaurants((data ?? []).map(toRestaurant));
  }, [uid, groupId, scope]);

  const fetchWishlist = useCallback(async () => {
    if (!uid) return;
    let q = supabase.from('wishlist').select('*').order('created_at', { ascending: false });
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null).eq('user_id', uid);
    const { data, error } = await q;
    if (scopeRef.current !== scope) return;
    if (error) return fail('wishlist', error);
    setWishlist((data ?? []).map(toWishlistItem));
  }, [uid, groupId, scope]);

  const fetchAlerts = useCallback(async () => {
    if (!uid || !groupId) {
      setAlerts([]);
      return;
    }
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (scopeRef.current !== scope) return;
    if (error) return fail('alerts', error);
    setAlerts((data ?? []).map(toAlert));
  }, [uid, groupId, scope]);

  // Càrrega inicial i Realtime: els avisos del canal de l'espai actiu refresquen la llista que ha canviat.
  useEffect(() => {
    if (!uid) {
      setRestaurants([]);
      setWishlist([]);
      setAlerts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRestaurants([]);
    setWishlist([]);
    setAlerts([]);
    Promise.all([fetchRestaurants(), fetchWishlist(), fetchAlerts()]).then(() => {
      if (!cancelled) setLoading(false);
    });

    const cancels: (() => void)[] = [];
    const debounced = (refresh: () => Promise<void>) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      cancels.push(() => clearTimeout(timer));
      return () => {
        clearTimeout(timer);
        timer = setTimeout(refresh, REFRESH_DEBOUNCE_MS);
      };
    };
    const refreshRestaurants = debounced(fetchRestaurants);
    // Les visites (i els assistents, que sempre canvien amb la visita) es carreguen amb els restaurants.
    const refreshers: Partial<Record<ChangedTable, () => void>> = {
      restaurants: refreshRestaurants,
      restaurant_visits: refreshRestaurants,
      wishlist: debounced(fetchWishlist),
      alerts: debounced(fetchAlerts),
    };
    const unsubscribe = subscribeToChanges(groupId ? `group:${groupId}` : `user:${uid}`, (notice) => {
      if (notice === 'resync') new Set(Object.values(refreshers)).forEach((refresh) => refresh());
      else refreshers[notice]?.();
    });

    return () => {
      cancelled = true;
      cancels.forEach((cancel) => cancel());
      unsubscribe();
    };
  }, [uid, groupId, fetchRestaurants, fetchWishlist, fetchAlerts]);

  // CRUD Restaurants
  type NewRestaurant = Omit<Restaurant, 'id' | 'groupId' | 'createdBy' | 'createdByName' | 'visits' | 'createdAt' | 'updatedAt'>;

  const addRestaurant = async (data: NewRestaurant) => {
    if (!uid || !userProfile) return false;
    const coords = data.address ? await geocodeAddress(data.address) : null;
    const { error } = await supabase
      .from('restaurants')
      .insert({
        ...restaurantToRow(data),
        ...coordinateColumns(coords),
        name: data.name,
        group_id: groupId,
        created_by: uid,
        created_by_name: userProfile.nickname,
      });
    if (error) {
      fail('addRestaurant', error);
      return false;
    }
    await fetchRestaurants();
    return true;
  };

  const updateRestaurant = async (resId: string, data: Partial<Restaurant>) => {
    if (!uid) return false;
    // Es tornen a calcular les coordenades si l'adreça canvia o si encara no en tenia.
    const current = restaurants.find((r) => r.id === resId);
    const relocate =
      data.address !== undefined && (data.address !== (current?.address ?? '') || current?.lat === undefined);
    const row = relocate
      ? { ...restaurantToRow(data), ...coordinateColumns(data.address ? await geocodeAddress(data.address) : null) }
      : restaurantToRow(data);
    // select(): sense files retornades l'update no ha tocat res (p. ex. RLS el filtra) i no és un èxit.
    const { data: rows, error } = await supabase
      .from('restaurants')
      .update(row)
      .eq('id', resId)
      .select('id');
    if (error || !rows?.length) {
      fail('updateRestaurant', error ?? 'Cap fila actualitzada (RLS?)');
      return false;
    }
    await fetchRestaurants();
    return true;
  };

  const deleteRestaurant = async (resId: string) => {
    if (!uid) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', resId);
    if (error) fail('deleteRestaurant', error);
    else await fetchRestaurants();
  };

  const toggleFavorite = async (restaurant: Restaurant) => {
    await updateRestaurant(restaurant.id, { favorite: !restaurant.favorite });
  };

  /**
   * Ubica des del mapa els restaurants amb adreça però sense coordenades, d'un en un (Nominatim, 1 petició/s).
   * Retorna quants no s'han pogut ubicar. `signal` l'atura (p. ex. en sortir del mapa).
   */
  const locateRestaurants = async (
    toLocate: Restaurant[],
    onProgress: (done: number) => void,
    signal?: AbortSignal,
  ) => {
    if (!uid) return 0;
    let notFound = 0;
    for (const [i, res] of toLocate.entries()) {
      const coords = res.address ? await geocodeAddress(res.address, signal) : null;
      if (signal?.aborted) break;
      if (coords) {
        const { error } = await supabase.from('restaurants').update(coordinateColumns(coords)).eq('id', res.id);
        if (error) {
          fail('locateRestaurants', error);
          break;
        }
      } else {
        notFound++;
      }
      onProgress(i + 1);
    }
    await fetchRestaurants();
    return notFound;
  };

  // Visites
  const saveVisit = async (
    restaurantId: string,
    visitedOn: string | undefined,
    rating: number | undefined,
    notes: string,
    attendeeIds: string[],
    shared: boolean,
    visitId?: string,
  ) => {
    if (!uid) return false;
    const { error } = await supabase.rpc('save_visit', {
      p_restaurant_id: restaurantId,
      p_visited_on: visitedOn ?? null,
      p_rating: rating ?? null,
      p_notes: notes,
      p_attendees: attendeeIds,
      p_shared: shared,
      p_visit_id: visitId,
    });
    if (error) {
      fail('saveVisit', error);
      return false;
    }
    await fetchRestaurants();
    return true;
  };

  const deleteVisit = async (visitId: string) => {
    if (!uid) return;
    const { error } = await supabase.rpc('delete_visit', { p_visit_id: visitId });
    if (error) fail('deleteVisit', error);
    else await fetchRestaurants();
  };

  // CRUD Wishlist
  const addWishlistItem = async (
    data: Omit<WishlistItem, 'id' | 'groupId' | 'userId' | 'userName' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!uid || !userProfile) return false;
    const { error } = await supabase
      .from('wishlist')
      .insert({
        ...wishlistToRow({ ...data, status: data.status || 'pending' }),
        restaurant_name: data.restaurantName,
        group_id: groupId,
        user_id: uid,
        user_name: userProfile.nickname,
      });
    if (error) {
      fail('addWishlistItem', error);
      return false;
    }
    await fetchWishlist();
    return true;
  };

  const updateWishlistItem = async (wishlistId: string, data: Partial<WishlistItem>) => {
    if (!uid) return false;
    // select(): sense files retornades l'update no ha tocat res (p. ex. RLS el filtra) i no és un èxit.
    const { data: rows, error } = await supabase
      .from('wishlist')
      .update(wishlistToRow(data))
      .eq('id', wishlistId)
      .select('id');
    if (error || !rows?.length) {
      fail('updateWishlistItem', error ?? 'Cap fila actualitzada (RLS?)');
      return false;
    }
    await fetchWishlist();
    return true;
  };

  const deleteWishlistItem = async (wishlistId: string) => {
    if (!uid) return;
    const { error } = await supabase.from('wishlist').delete().eq('id', wishlistId);
    if (error) fail('deleteWishlistItem', error);
    else await fetchWishlist();
  };

  // Converteix un desitjat en restaurant del seu espai amb la primera visita. La RPC ho fa tot en una
  // transacció: si alguna part falla, el desitjat continua pendent i no queda cap restaurant a mitges.
  const convertingRef = useRef<Set<string>>(new Set());
  interface VisitOverride {
    visitedOn: string | undefined;
    rating: number | undefined;
    notes: string;
    attendeeIds: string[];
    shared: boolean;
  }

  const convertWishlistToRestaurant = async (wishlistItem: WishlistItem, visitOverride?: VisitOverride) => {
    if (!uid || wishlistItem.status === 'visited' || convertingRef.current.has(wishlistItem.id)) return;
    convertingRef.current.add(wishlistItem.id);
    try {
      const { data: restaurantId, error } = await supabase.rpc('convert_wishlist_to_restaurant', {
        p_wishlist_id: wishlistItem.id,
        p_visited_on: visitOverride?.visitedOn ?? localToday(),
        p_rating: visitOverride?.rating ?? null,
        p_notes: visitOverride?.notes ?? '',
        p_attendees: visitOverride?.attendeeIds ?? [uid],
        p_shared: visitOverride?.shared ?? true,
      });
      if (error) {
        fail('convertWishlistToRestaurant', error);
        return;
      }
      await Promise.all([fetchRestaurants(), fetchWishlist()]);
      // Els desitjats no tenen coordenades: el restaurant nou s'ubica un cop creat.
      const coords = wishlistItem.address ? await geocodeAddress(wishlistItem.address) : null;
      if (coords) {
        const { error: locateError } = await supabase
          .from('restaurants')
          .update(coordinateColumns(coords))
          .eq('id', restaurantId);
        if (locateError) logError('convertWishlistToRestaurant', locateError);
        else await fetchRestaurants();
      }
    } finally {
      convertingRef.current.delete(wishlistItem.id);
    }
  };

  // Copiar / moure cap a grups (RPC al servidor)
  const copyToGroups = async (type: 'restaurant' | 'wishlist', itemId: string, groupIds: string[]) => {
    if (!uid || groupIds.length === 0) return 0;
    const { data, error } = await supabase.rpc('copy_to_groups', {
      p_type: type,
      p_id: itemId,
      p_group_ids: groupIds,
    });
    if (error) {
      fail('copyToGroups', error);
      throw error;
    }
    return data as number;
  };

  const moveToGroup = async (type: 'restaurant' | 'wishlist', itemId: string, targetGroupId: string) => {
    if (!uid) return;
    const { error } = await supabase.rpc('move_to_group', {
      p_type: type,
      p_id: itemId,
      p_group_id: targetGroupId,
    });
    if (error) {
      fail('moveToGroup', error);
      throw error;
    }
    await Promise.all([fetchRestaurants(), fetchWishlist()]);
  };

  // Alertes
  const markAlertAsRead = async (alertId: string) => {
    if (!uid) return;
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert || alert.readBy?.includes(uid)) return;
    const { error } = await supabase.rpc('mark_alerts_read', { p_ids: [alertId] });
    if (error) fail('markAlertAsRead', error);
    else await fetchAlerts();
  };

  const markAllAlertsAsRead = async () => {
    if (!uid) return;
    const unread = alerts.filter((a) => !a.readBy?.includes(uid)).map((a) => a.id);
    if (unread.length === 0) return;
    const { error } = await supabase.rpc('mark_alerts_read', { p_ids: unread });
    if (error) fail('markAllAlertsAsRead', error);
    else await fetchAlerts();
  };

  return {
    isPersonal,
    restaurants,
    wishlist,
    alerts,
    loading,
    error,
    clearError,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    toggleFavorite,
    locateRestaurants,
    saveVisit,
    deleteVisit,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    convertWishlistToRestaurant,
    copyToGroups,
    moveToGroup,
    markAlertAsRead,
    markAllAlertsAsRead,
  };
}
