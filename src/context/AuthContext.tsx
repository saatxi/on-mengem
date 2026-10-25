import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { toGroup, toProfile } from '../supabase/mappers';
import { subscribeToChanges } from '../supabase/realtime';
import type { TablesUpdate } from '../supabase/database';
import { UserProfile, Group } from '../types';
import { markLoginTourPending } from '../utils/loginTour';

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  authUser: AuthUser | null;
  userProfile: UserProfile | null;
  /** Grup actiu; null = espai personal de l'usuari. */
  activeGroup: Group | null;
  userGroups: Group[];
  isLoading: boolean;
  hasProfile: boolean;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  /** groupId = null per tornar a l'espai personal. */
  setActiveGroupId: (groupId: string | null) => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<string>;
  joinGroupByCode: (code: string) => Promise<{ success: boolean; message: string; groupId?: string }>;
  /** Sortir del grup (l'owner primer l'ha de cedir o esborrar). */
  leaveGroup: (groupId: string) => Promise<void>;
  /** Només owner. */
  removeMember: (groupId: string, userId: string) => Promise<void>;
  transferOwnership: (groupId: string, userId: string) => Promise<void>;
  regenerateGroupCode: (groupId: string) => Promise<string>;
  deleteGroup: (groupId: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// user_metadata l'edita l'usuari: només s'accepten fotos https.
function safeHttpsUrl(url: unknown): string | undefined {
  return typeof url === 'string' && /^https:\/\//i.test(url) ? url : undefined;
}

function toAuthUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  return {
    uid: u.id,
    email: u.email ?? undefined,
    displayName: meta.full_name ?? meta.name ?? undefined,
    photoURL: safeHttpsUrl(meta.avatar_url ?? meta.picture),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Els canvis de grups que arriben seguits (p. ex. esborrar un grup i els seus membres) es resolen amb un sol refresc. */
const GROUPS_REFRESH_DEBOUNCE_MS = 300;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sessió de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = toAuthUser(data.session);
      setAuthUser(user);
      if (!user) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = toAuthUser(session);
      // Evita re-renders si és el mateix usuari (refresc de token)
      setAuthUser((prev) => (prev?.uid === user?.uid ? prev : user));
      if (!user) {
        setUserProfile(null);
        setUserGroups([]);
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = authUser?.uid;

  const fetchProfile = useCallback(async () => {
    if (!uid) return;
    // El trigger de la BD crea el perfil just després del primer login: reintenta breument.
    // get_my_profile(): els camps privats (espai actiu, últim accés) no es poden llegir de la taula.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase.rpc('get_my_profile').maybeSingle();
      if (error) {
        console.error('Error carregant el perfil:', error);
        break;
      }
      if (data) {
        setUserProfile(toProfile(data));
        return;
      }
      await sleep(400);
    }
  }, [uid]);

  const fetchGroups = useCallback(async () => {
    if (!uid) return;
    const { data, error } = await supabase.from('groups').select('*, group_members(user_id)').order('created_at', { ascending: true });
    if (error) {
      console.error('Error carregant els grups:', error);
      return;
    }
    setUserGroups((data ?? []).map(toGroup));
  }, [uid]);

  // Càrrega inicial + Realtime (perfil i grups)
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      await Promise.all([fetchProfile(), fetchGroups()]);
      if (!cancelled) setIsLoading(false);
      // Registra l'últim accés un cop per sessió carregada (no a cada edició del perfil).
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', uid);
    })();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshGroups = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchGroups, GROUPS_REFRESH_DEBOUNCE_MS);
    };
    // El canal de l'usuari avisa dels canvis del perfil propi i dels grups on és (nom, owner, membres, entrades i sortides).
    const unsubscribe = subscribeToChanges(`user:${uid}`, (notice) => {
      if (notice === 'profiles' || notice === 'resync') fetchProfile();
      if (notice === 'groups' || notice === 'group_members' || notice === 'resync') refreshGroups();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [uid, fetchProfile, fetchGroups]);

  // Grup actiu derivat del perfil; sense coincidència => espai personal
  const activeGroup = userGroups.find((g) => g.id === userProfile?.activeGroupId) ?? null;

  const loginWithGoogle = async () => {
    markLoginTourPending();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      console.error('Error iniciant sessió amb Google:', error);
      throw error;
    }
    // El navegador redirigeix a Google; en tornar, onAuthStateChange emet la sessió.
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!uid) return;
    const row: TablesUpdate<'profiles'> = {};
    if (data.nickname !== undefined) row.nickname = data.nickname;
    if (data.avatar !== undefined) row.avatar = data.avatar;
    if (Object.keys(row).length === 0) return;
    const { error } = await supabase.from('profiles').update(row).eq('id', uid);
    if (error) {
      console.error('Error actualitzant el perfil:', error);
      throw error;
    }
    await fetchProfile();
  };

  const setActiveGroupId = async (groupId: string | null) => {
    if (!uid) return;
    const { error } = await supabase.from('profiles').update({ active_group_id: groupId }).eq('id', uid);
    if (error) console.error("Error canviant d'espai:", error);
    else await fetchProfile();
  };

  const createGroup = async (name: string, description?: string): Promise<string> => {
    if (!uid) throw new Error('Usuari no autenticat');
    const { data, error } = await supabase.rpc('create_group', {
      p_name: name.trim(),
      p_description: description?.trim() ?? '',
    });
    if (error) throw error;
    await Promise.all([fetchGroups(), fetchProfile()]);
    return (data as { id: string }).id;
  };

  const joinGroupByCode = async (code: string): Promise<{ success: boolean; message: string; groupId?: string }> => {
    if (!uid) return { success: false, message: 'Usuari no identificat' };

    const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code.trim() });
    if (error) {
      console.error('Error en unir-se al grup:', error);
      return { success: false, message: 'Error en unir-se al grup.' };
    }

    const result = data as { error?: string; id: string; name: string; already_member: boolean };
    if (result.error === 'GROUP_NOT_FOUND') {
      return { success: false, message: "No s'ha trobat cap grup amb aquest codi." };
    }
    if (result.error === 'TOO_MANY_ATTEMPTS') {
      return { success: false, message: "Massa intents fallits. Torna-ho a provar d'aquí a 10 minuts." };
    }

    await Promise.all([fetchGroups(), fetchProfile()]);
    const group = result;
    return {
      success: true,
      message: group.already_member ? `Ja ets membre de "${group.name}". L'hem activat!` : `T'has unit correctament a "${group.name}"!`,
      groupId: group.id,
    };
  };

  const refreshGroups = () => Promise.all([fetchGroups(), fetchProfile()]);

  // Les polítiques RLS no fallen quan no afecten cap fila: es comprova que s'hagi esborrat alguna cosa.
  const leaveGroup = async (groupId: string) => {
    if (!uid) return;
    const { data, error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid).select();
    if (error) throw error;
    if (!data?.length) throw new Error("No pots sortir d'aquest grup. Si n'ets el creador, cedeix-lo o esborra'l.");
    await refreshGroups();
  };

  const removeMember = async (groupId: string, userId: string) => {
    const { data, error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId).select();
    if (error) throw error;
    if (!data?.length) throw new Error("No s'ha pogut expulsar el membre.");
    await refreshGroups();
  };

  const transferOwnership = async (groupId: string, userId: string) => {
    const { error } = await supabase.rpc('transfer_group_ownership', { p_group_id: groupId, p_new_owner: userId });
    if (error) throw error;
    await refreshGroups();
  };

  const regenerateGroupCode = async (groupId: string): Promise<string> => {
    const { data, error } = await supabase.rpc('regenerate_group_code', { p_group_id: groupId });
    if (error) throw error;
    await fetchGroups();
    return data as string;
  };

  const deleteGroup = async (groupId: string) => {
    const { data, error } = await supabase.from('groups').delete().eq('id', groupId).select();
    if (error) throw error;
    if (!data?.length) throw new Error("No s'ha pogut esborrar el grup.");
    await refreshGroups();
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setAuthUser(null);
    setUserProfile(null);
    setUserGroups([]);
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    // L'usuari ja no existeix al servidor: només cal esborrar la sessió local.
    await supabase.auth.signOut({ scope: 'local' });
    setAuthUser(null);
    setUserProfile(null);
    setUserGroups([]);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        userProfile,
        activeGroup,
        userGroups,
        isLoading,
        hasProfile: !!authUser && !!userProfile?.nickname,
        loginWithGoogle,
        updateProfile,
        setActiveGroupId,
        createGroup,
        joinGroupByCode,
        leaveGroup,
        removeMember,
        transferOwnership,
        regenerateGroupCode,
        deleteGroup,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
