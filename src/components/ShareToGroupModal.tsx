import React, { useState } from 'react';
import { Copy, ArrowRightLeft, Users } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalHeader } from './Modal';
import { Group } from '../types';

interface Props {
  isOpen: boolean;
  mode: 'copy' | 'move';
  itemName: string;
  groups: Group[];
  onClose: () => void;
  onConfirm: (groupIds: string[]) => Promise<void>;
}

export const ShareToGroupModal: React.FC<Props> = ({ isOpen, mode, itemName, groups, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMove = mode === 'move';

  const toggle = (id: string) => {
    if (isMove) setSelected([id]);
    else setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const close = () => {
    setSelected([]);
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(selected);
      close();
    } catch (e) {
      console.error(e);
      setError("No s'ha pogut completar l'acció. Torna-ho a provar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal label={isMove ? 'Moure a un grup' : 'Copiar a un grup'} onClose={close} size="sm">
      <ModalHeader
        title={isMove ? 'Moure a un grup' : 'Copiar a un grup'}
        subtitle={itemName}
        icon={isMove ? ArrowRightLeft : Copy}
        onClose={close}
      />

      <div className="p-5 space-y-3">
        <p className="text-xs text-stone-500">
          {isMove
            ? "Se'n anirà del teu espai personal i passarà al grup escollit."
            : "Es crearà una còpia a cada grup seleccionat. L'original es manté."}
        </p>

        {groups.length === 0 ? (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
            Encara no ets membre de cap grup. Crea'n un o uneix-te amb un codi.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {groups.map((g) => {
              const checked = selected.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    checked ? 'border-accent bg-accent-soft' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type={isMove ? 'radio' : 'checkbox'}
                    name="target-group"
                    checked={checked}
                    onChange={() => toggle(g.id)}
                    className="accent-accent"
                  />
                  <Users className="w-4 h-4 text-stone-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900 truncate">{g.name}</div>
                    <div className="text-xs text-stone-500">{g.memberUids.length} membres</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {error && <div className="text-xs text-red-600 font-medium">{error}</div>}

        <Button onClick={submit} disabled={busy || selected.length === 0} variant="primary" size="lg" className="w-full">
          {busy ? 'Processant…' : isMove ? 'Moure' : `Copiar${selected.length > 1 ? ` a ${selected.length} grups` : ''}`}
        </Button>
      </div>
    </Modal>
  );
};
