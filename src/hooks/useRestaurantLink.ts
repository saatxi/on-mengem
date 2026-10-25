import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../context/AuthContext';
import { readRestaurantParam, withoutRestaurantParam } from '../utils/restaurantLink';

// El login amb Google torna a l'arrel de l'app i perdria el `?r=`: es guarda a la sessió del navegador.
const STORAGE_KEY = 'on-mengem:pending-restaurant';

const NOT_FOUND_MESSAGE = "No s'ha trobat el restaurant de l'enllaç, o no hi tens accés.";

export function takePendingRestaurantId(): string | null {
  try {
    const fromUrl = readRestaurantParam(window.location.search);
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      window.history.replaceState(null, '', withoutRestaurantParam(window.location.href));
    }
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return readRestaurantParam(window.location.search);
  }
}

function clearPendingId() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sense sessionStorage no hi ha res a esborrar.
  }
}

/**
 * Obre el restaurant d'un enllaç directe (`?r=<id>`): quan hi ha sessió, busca a quin espai és,
 * hi canvia si cal i crida `onOpen`. Retorna un missatge d'error si l'usuari no hi té accés.
 */
export function useRestaurantLink(onOpen: (restaurantId: string) => void) {
  const { authUser, userProfile, setActiveGroupId } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(takePendingRestaurantId);
  const [error, setError] = useState<string | null>(null);

  const ready = !!authUser && !!userProfile;

  useEffect(() => {
    if (!ready || !pendingId) return;
    let cancelled = false;

    (async () => {
      // RLS només retorna el restaurant si és a l'espai personal de l'usuari o a un grup on és membre.
      const { data, error: queryError } = await supabase.from('restaurants').select('group_id').eq('id', pendingId).maybeSingle();
      if (cancelled) return;
      clearPendingId();
      setPendingId(null);

      if (queryError || !data) {
        if (queryError) console.error("Error obrint l'enllaç del restaurant:", queryError);
        setError(NOT_FOUND_MESSAGE);
        return;
      }
      if ((data.group_id ?? null) !== (userProfile?.activeGroupId ?? null)) await setActiveGroupId(data.group_id);
      onOpen(pendingId);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, pendingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearError = useCallback(() => setError(null), []);
  return { error, clearError };
}
