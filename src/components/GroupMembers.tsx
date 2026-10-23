import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useConfirm } from './ConfirmDialog';
import { Group } from '../types';

interface Props {
  group: Group;
  onJoinGroup: () => void;
  onCreateGroup: () => void;
}

export const GroupMembers: React.FC<Props> = ({ group, onJoinGroup, onCreateGroup }) => {
  const { userProfile, leaveGroup, removeMember, transferOwnership, regenerateGroupCode, deleteGroup } = useAuth();
  const members = useGroupMembers(group);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const isOwner = group.ownerId === userProfile?.id;

  const run = async (question: Parameters<typeof confirm>[0], action: () => Promise<unknown>) => {
    if (!(await confirm(question))) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No s\'ha pogut completar l\'acció.');
    } finally {
      setBusy(false);
    }
  };

  const linkBtn = 'text-xs font-bold px-2 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 transition disabled:opacity-50';

  return (
    <div className="bg-surface p-6 rounded-3xl border border-stone-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          Membres sincronitzats ({group.memberUids.length})
        </h3>

        <div className="flex gap-2">
          <button
            onClick={onJoinGroup}
            className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 transition"
          >
            + Unir-se a altre grup
          </button>
          <button
            onClick={onCreateGroup}
            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition"
          >
            + Crear nou grup
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 text-xs font-semibold text-red-600">{error}</p>}

      <div className="divide-y divide-stone-100">
        {group.memberUids.map((uid, index) => {
          const isCurrent = uid === userProfile?.id;
          const isGroupOwner = uid === group.ownerId;
          const info = members[uid];
          const name = info?.nickname ?? (isGroupOwner ? group.ownerName : null) ?? `Membre ${index + 1}`;
          return (
            <div key={uid} className="py-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-lg">
                  {info?.avatar ?? (isCurrent ? userProfile?.avatar : null) ?? '👤'}
                </div>
                <div className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span>{isCurrent ? `${name} (Tu)` : name}</span>
                  {isGroupOwner && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      Creador
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5">
                {isOwner && !isCurrent && (
                  <>
                    <button
                      disabled={busy}
                      className={linkBtn}
                      onClick={() =>
                        run({ message: `Vols cedir el grup "${group.name}" a ${name}?`, details: 'Deixaràs de ser-ne el creador.', confirmLabel: 'Cedir grup' }, () =>
                          transferOwnership(group.id, uid)
                        )
                      }
                    >
                      Cedir grup
                    </button>
                    <button
                      disabled={busy}
                      className={`${linkBtn} text-red-600`}
                      onClick={() => run({ message: `Vols expulsar ${name} del grup?`, confirmLabel: 'Expulsar', destructive: true }, () => removeMember(group.id, uid))}
                    >
                      Expulsar
                    </button>
                  </>
                )}
                {isCurrent && !isOwner && (
                  <button
                    disabled={busy}
                    className={`${linkBtn} text-red-600`}
                    onClick={() => run({ message: `Vols sortir del grup "${group.name}"?`, confirmLabel: 'Sortir', destructive: true }, () => leaveGroup(group.id))}
                  >
                    Sortir del grup
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isOwner && (
        <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2 flex-wrap">
          <button
            disabled={busy}
            className={linkBtn}
            onClick={() =>
              run({ message: 'Vols generar un codi d\'invitació nou?', details: 'El codi actual deixarà de funcionar.', confirmLabel: 'Generar' }, () =>
                regenerateGroupCode(group.id)
              )
            }
          >
            Generar un codi nou
          </button>
          <button
            disabled={busy}
            className={`${linkBtn} text-red-600`}
            onClick={() =>
              run(
                {
                  message: `Vols esborrar el grup "${group.name}"?`,
                  details: 'S\'eliminaran per a tothom els seus restaurants, desitjats i alertes.',
                  confirmLabel: 'Esborrar el grup',
                  destructive: true,
                },
                () => deleteGroup(group.id)
              )
            }
          >
            Esborrar el grup
          </button>
        </div>
      )}
    </div>
  );
};
