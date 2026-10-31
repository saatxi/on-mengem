import React, { createContext, useContext, useMemo } from 'react';
import { Reaction, ReactionEmoji, ReactionTarget } from '../types';
import { useAuth } from './AuthContext';
import { useGroupMembers, type MemberInfo } from '../hooks/useGroupMembers';
import { targetKey } from '../utils/reactions';

interface ReactionsContextType {
  /** Només als grups: a l'espai personal no hi ha reaccions. */
  enabled: boolean;
  uid?: string;
  members: Record<string, MemberInfo>;
  reactionsFor: (target: ReactionTarget) => Reaction[];
  toggle: (target: ReactionTarget, emoji: ReactionEmoji) => void;
}

const ReactionsContext = createContext<ReactionsContextType | null>(null);

const NO_REACTIONS: Reaction[] = [];

interface Props {
  reactions: Reaction[];
  onToggle: (target: ReactionTarget, emoji: ReactionEmoji) => void;
  children: React.ReactNode;
}

// Reaccions de l'espai actiu per a qualsevol ReactionBar (targetes, detall, activitat) sense passar-les per props
export const ReactionsProvider: React.FC<Props> = ({ reactions, onToggle, children }) => {
  const { authUser, activeGroup } = useAuth();
  const members = useGroupMembers(activeGroup ?? null);

  const byTarget = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    for (const reaction of reactions) {
      const key = targetKey(reaction.target);
      map.set(key, [...(map.get(key) ?? []), reaction]);
    }
    return map;
  }, [reactions]);

  const value = useMemo<ReactionsContextType>(
    () => ({
      enabled: activeGroup != null,
      uid: authUser?.uid,
      members,
      reactionsFor: (target) => byTarget.get(targetKey(target)) ?? NO_REACTIONS,
      toggle: onToggle,
    }),
    [activeGroup, authUser?.uid, members, byTarget, onToggle],
  );

  return <ReactionsContext.Provider value={value}>{children}</ReactionsContext.Provider>;
};

export function useReactions() {
  const context = useContext(ReactionsContext);
  if (!context) {
    throw new Error('useReactions must be used within a ReactionsProvider');
  }
  return context;
}
