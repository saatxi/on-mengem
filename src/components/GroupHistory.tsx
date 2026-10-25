import React, { useState } from 'react';
import { History, Pencil, Trash2, Undo2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroupHistory } from '../hooks/useGroupHistory';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useConfirm } from './ConfirmDialog';
import { Button } from './Button';
import { Group, GroupChange, GroupChangeItemType } from '../types';
import { changeTitle, deletedSummary, fieldChanges } from '../utils/groupChanges';
import { timeAgo } from '../utils/time';
import { cn } from '../utils/cn';
import { CARD } from '../utils/ui';

interface Props {
  group: Group;
}

// Mateixos colors que les alertes d'alta de cada tipus (AlertsFeed)
const ITEM_COLORS: Record<GroupChangeItemType, string> = {
  restaurant: 'bg-accent-soft text-accent',
  wishlist: 'bg-violet-100 text-violet-700',
  visit: 'bg-emerald-100 text-emerald-600',
};

const confirmQuestion = (change: GroupChange) => {
  if (change.action === 'update') {
    return {
      message: 'Vols desfer aquest canvi?',
      details: "Els camps tornaran al valor d'abans, encara que algú els hagi tornat a canviar després.",
      confirmLabel: 'Desfer',
    };
  }
  const what = change.itemType === 'visit' ? `la visita a «${change.itemName}»` : `«${change.itemName}»`;
  return {
    message: `Vols recuperar ${what}?`,
    details: change.itemType === 'restaurant' ? 'Tornarà amb les visites que tenia.' : undefined,
    confirmLabel: 'Recuperar',
  };
};

export const GroupHistory: React.FC<Props> = ({ group }) => {
  const { userProfile } = useAuth();
  const { changes, loading, hasMore, loadMore, restore } = useGroupHistory(group.id);
  const members = useGroupMembers(group);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const confirm = useConfirm();

  const uid = userProfile?.id;
  const nameOf = (memberId: string) => (memberId === uid ? 'Tu' : (members[memberId]?.nickname ?? 'Antic membre'));

  // Una visita privada esborrada només la pot recuperar l'autor (o qualsevol si ja no hi és)
  const canRestore = (change: GroupChange) => {
    if (change.itemType !== 'visit' || change.action !== 'delete' || change.oldData.shared !== false) return true;
    const author = change.oldData.created_by;
    return !author || author === uid;
  };

  const handleRestore = async (change: GroupChange) => {
    if (!(await confirm(confirmQuestion(change)))) return;
    setBusyId(change.id);
    setError(null);
    try {
      await restore(change.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No s'ha pogut desfer el canvi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={cn(CARD, 'p-5 sm:p-7')}>
      <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
        <History className="w-4 h-4 text-accent" />
        Historial de canvis
      </h3>
      <p className="mt-0.5 mb-4 text-xs text-stone-500">
        Edicions i esborrats de restaurants, desitjats i visites dels darrers 90 dies. Qualsevol membre els pot desfer.
      </p>

      {error && (
        <p role="alert" className="mb-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-stone-500">Carregant l'historial...</div>
      ) : changes.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-500">
          Encara no hi ha cap canvi. Quan algú editi o esborri alguna cosa del grup, ho veuràs aquí.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {changes.map((change) => {
            const Icon = change.action === 'delete' ? Trash2 : Pencil;
            const fields = fieldChanges(change, nameOf);
            const summary = deletedSummary(change);
            return (
              <li key={change.id} className="py-3 flex items-start gap-3">
                <span className={cn('size-9 shrink-0 rounded-2xl flex items-center justify-center', ITEM_COLORS[change.itemType])}>
                  <Icon className="size-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900 break-words">{changeTitle(change)}</p>
                    <span className="text-xs text-stone-500 whitespace-nowrap shrink-0">{timeAgo(change.createdAt)}</span>
                  </div>

                  {fields.length > 0 && (
                    <dl className="mt-1 space-y-0.5 text-xs text-stone-600">
                      {fields.map((f) => (
                        <div key={f.label} className="break-words">
                          <dt className="inline font-semibold">{f.label}: </dt>
                          <dd className="inline">
                            <span className="text-stone-500 line-through">{f.before}</span>
                            {' → '}
                            <span>{f.after}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {summary && <p className="mt-1 text-xs text-stone-600">{summary}</p>}

                  <div className="mt-2">
                    {change.restoredAt ? (
                      <span className="text-xs font-medium text-stone-500">
                        {change.action === 'delete' ? 'Recuperat' : 'Desfet'} per {change.restoredByName ?? 'algú'} ·{' '}
                        {timeAgo(change.restoredAt)}
                      </span>
                    ) : (
                      canRestore(change) && (
                        <Button size="sm" variant="secondary" disabled={busyId !== null} onClick={() => handleRestore(change)}>
                          <Undo2 className="w-3.5 h-3.5" />
                          {change.action === 'delete' ? 'Recuperar' : 'Desfer'}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-3 text-center">
          <Button size="sm" variant="ghost" onClick={loadMore}>
            Mostra'n més
          </Button>
        </div>
      )}
    </div>
  );
};
