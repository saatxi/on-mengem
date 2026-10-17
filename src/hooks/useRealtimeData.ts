import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import {
  toRestaurant,
  toWishlistItem,
  toAlert,
  restaurantToRow,
  wishlistToRow,
} from '../supabase/mappers';
import { useAuth } from '../context/AuthContext';
import { Restaurant, WishlistItem, Alert } from '../types';

function logError(action: string, error: unknown) {
  console.error(`[Supabase] ${action}:`, error);
}

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

  const fetchRestaurants = useCallback(async () => {
    if (!uid) return;
    let q = supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null).eq('created_by', uid);
    const { data, error } = await q;
    if (error) return logError('restaurants', error);
    setRestaurants((data ?? []).map(toRestaurant));
  }, [uid, groupId]);

  const fetchWishlist = useCallback(async () => {
    if (!uid) return;
    let q = supabase.from('wishlist').select('*').order('created_at', { ascending: false });
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null).eq('user_id', uid);
    const { data, error } = await q;
    if (error) return logError('wishlist', error);
    setWishlist((data ?? []).map(toWishlistItem));
  }, [uid, groupId]);

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
    if (error) return logError('alerts', error);
    setAlerts((data ?? []).map(toAlert));
  }, [uid, groupId]);

  // Càrrega inicial i Realtime: qualsevol canvi a les taules refresca la llista (RLS filtra els events).
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
    Promise.all([fetchRestaurants(), fetchWishlist(), fetchAlerts()]).then(() => {
      if (!cancelled) setLoading(false);
    });

    const channel = supabase
      .channel(`data-${uid}-${groupId ?? 'personal'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, fetchRestaurants)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' }, fetchWishlist)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, fetchAlerts)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, groupId, fetchRestaurants, fetchWishlist, fetchAlerts]);

  const createAlert = async (
    type: Alert['type'],
    title: string,
    message: string,
    restaurantId?: string
  ) => {
    if (!uid || !groupId) return;
    const { error } = await supabase.from('alerts').insert({
      group_id: groupId,
      user_id: uid,
      type,
      title,
      message,
      restaurant_id: restaurantId ?? null,
      read_by: [uid],
    });
    if (error) logError('alert', error);
  };

  // CRUD Restaurants
  const addRestaurant = async (
    data: Omit<Restaurant, 'id' | 'groupId' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!uid || !userProfile) return;
    const { data: row, error } = await supabase
      .from('restaurants')
      .insert({
        ...restaurantToRow(data),
        group_id: groupId,
        created_by: uid,
        created_by_name: userProfile.nickname,
      })
      .select()
      .single();
    if (error) return logError('addRestaurant', error);

    await createAlert(
      'restaurant_added',
      'Nou restaurant afegit!',
      `${userProfile.nickname} ha afegit "${row.name}" a la col·lecció del grup.`,
      row.id
    );
    await fetchRestaurants();
  };

  const updateRestaurant = async (resId: string, data: Partial<Restaurant>) => {
    if (!uid) return;
    const { error } = await supabase.from('restaurants').update(restaurantToRow(data)).eq('id', resId);
    if (error) logError('updateRestaurant', error);
    else await fetchRestaurants();
  };

  const deleteRestaurant = async (resId: string) => {
    if (!uid) return;
    const { error } = await supabase.from('restaurants').delete().eq('id', resId);
    if (error) logError('deleteRestaurant', error);
    else await fetchRestaurants();
  };

  const toggleFavorite = async (restaurant: Restaurant) => {
    await updateRestaurant(restaurant.id, { favorite: !restaurant.favorite });
  };

  const toggleVisited = async (restaurant: Restaurant) => {
    await updateRestaurant(restaurant.id, { visited: !restaurant.visited });
  };

  // CRUD Wishlist
  const addWishlistItem = async (
    data: Omit<WishlistItem, 'id' | 'groupId' | 'userId' | 'userName' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!uid || !userProfile) return;
    const { data: row, error } = await supabase
      .from('wishlist')
      .insert({
        ...wishlistToRow({ ...data, status: data.status || 'pending' }),
        group_id: groupId,
        user_id: uid,
        user_name: userProfile.nickname,
      })
      .select()
      .single();
    if (error) return logError('addWishlistItem', error);

    await createAlert(
      'wishlist_added',
      'Nou desitjat proposat!',
      `${userProfile.nickname} vol anar a provar "${row.restaurant_name}".`
    );
    await fetchWishlist();
  };

  const updateWishlistItem = async (wishlistId: string, data: Partial<WishlistItem>) => {
    if (!uid) return;
    const { error } = await supabase.from('wishlist').update(wishlistToRow(data)).eq('id', wishlistId);
    if (error) logError('updateWishlistItem', error);
    else await fetchWishlist();
  };

  const deleteWishlistItem = async (wishlistId: string) => {
    if (!uid) return;
    const { error } = await supabase.from('wishlist').delete().eq('id', wishlistId);
    if (error) logError('deleteWishlistItem', error);
    else await fetchWishlist();
  };

  // Converteix un desitjat en restaurant de l'espai actiu
  const convertWishlistToRestaurant = async (wishlistItem: WishlistItem) => {
    if (!uid || !userProfile) return;

    await addRestaurant({
      name: wishlistItem.restaurantName,
      cuisine: wishlistItem.cuisine || '',
      priceRange: wishlistItem.priceRange || '€€',
      notes: wishlistItem.notes ? `(Desitjat original: ${wishlistItem.notes})` : '',
      tags: ['Desitjat provat'],
      rating: 4.5,
      visited: true,
      favorite: false,
    });

    await updateWishlistItem(wishlistItem.id, { status: 'visited' });
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
      logError('copyToGroups', error);
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
      logError('moveToGroup', error);
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
    if (error) logError('markAlertAsRead', error);
    else await fetchAlerts();
  };

  const markAllAlertsAsRead = async () => {
    if (!uid) return;
    const unread = alerts.filter((a) => !a.readBy?.includes(uid)).map((a) => a.id);
    if (unread.length === 0) return;
    const { error } = await supabase.rpc('mark_alerts_read', { p_ids: unread });
    if (error) logError('markAllAlertsAsRead', error);
    else await fetchAlerts();
  };

  return {
    isPersonal,
    restaurants,
    wishlist,
    alerts,
    loading,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    toggleFavorite,
    toggleVisited,
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
