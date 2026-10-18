import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { Group } from '../types';

export interface MemberInfo {
  nickname: string;
  avatar: string;
}

/**
 * Carrega els perfils visibles dels membres del grup donat.
 * Retorna un map uid -> { nickname, avatar }.
 */
export function useGroupMembers(group: Group | null): Record<string, MemberInfo> {
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});

  const memberKey = group?.memberUids.join(',') ?? '';

  useEffect(() => {
    if (!group || group.memberUids.length === 0) {
      setMembers({});
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, nickname, avatar')
      .in('id', group.memberUids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMembers(Object.fromEntries(data.map((p) => [p.id, { nickname: p.nickname, avatar: p.avatar }])));
      });
    return () => {
      cancelled = true;
    };
  }, [memberKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return members;
}
