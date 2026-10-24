import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { toGroupChange } from '../supabase/mappers';
import { subscribeToChanges } from '../supabase/realtime';
import { GroupChange } from '../types';

/** Entrades que es carreguen de cop: el servidor en guarda fins a 1.000 per grup (quota_limit('group_changes')). */
const PAGE_SIZE = 30;
const REFRESH_DEBOUNCE_MS = 300;

/**
 * Historial de canvis del grup (edicions i esborrats de restaurants, desitjats i visites), en temps real.
 * `restore` desfà una entrada; si el servidor ho rebutja, llança l'error amb el missatge en català.
 */
export function useGroupHistory(groupId: string) {
  const [changes, setChanges] = useState<GroupChange[]>([]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchChanges = useCallback(async () => {
    // Se'n demana una de més per saber si n'hi ha més per carregar.
    const { data, error } = await supabase
      .from('group_changes')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    setLoading(false);
    if (error) {
      console.error('[Supabase] group_changes:', error);
      return;
    }
    setChanges(data.slice(0, limit).map(toGroupChange));
    setHasMore(data.length > limit);
  }, [groupId, limit]);

  useEffect(() => {
    fetchChanges();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchChanges, REFRESH_DEBOUNCE_MS);
    };
    const unsubscribe = subscribeToChanges(`group:${groupId}`, (table) => {
      if (table === 'group_changes') refresh();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [groupId, fetchChanges]);

  const restore = async (changeId: string) => {
    const { error } = await supabase.rpc('restore_group_change', { p_change_id: changeId });
    if (error) throw error;
    await fetchChanges();
  };

  const loadMore = () => setLimit((n) => n + PAGE_SIZE);

  return { changes, loading, hasMore, loadMore, restore };
}
