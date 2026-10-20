import React, { useState } from 'react';
import { X, Copy, ArrowRightLeft, Users } from 'lucide-react';
import { Modal } from './Modal';
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
      setError('No s\'ha pogut completar l\'acció. Torna-ho a provar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal label={isMove ? 'Moure a un grup' : 'Copiar a un grup'} onClose={close} panelClassName="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden" overlayClassName="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex items-center justify-between px-5 py-4 bg-stone-900 text-white">
        <div className="flex items-center gap-2 min-w-0">
          {isMove ? <ArrowRightLeft className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <h3 className="text-sm font-bold truncate">
            {isMove ? 'Moure' : 'Copiar'} "{itemName}" a…
          </h3>
        </div>
        <button onClick={close} aria-label="Tanca" className="p-1 rounded-full hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-xs text-stone-500">
          {isMove
            ? 'Se\'n anirà del teu espai personal i passarà al grup escollit.'
            : 'Es crearà una còpia a cada grup seleccionat. L\'original es manté.'}
        </p>

        {groups.length === 0 ? (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
            Encara no ets membre de cap grup. Crea'n un o uneix-te amb un codi.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {groups.map((g) => {
              const checked = selected.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    checked ? 'border-orange-400 bg-orange-50' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type={isMove ? 'radio' : 'checkbox'}
                    name="target-group"
                    checked={checked}
                    onChange={() => toggle(g.id)}
                    className="accent-orange-600"
                  />
                  <Users className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900 truncate">{g.name}</div>
                    <div className="text-[10px] text-stone-400">{g.memberUids.length} membres</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {error && <div className="text-xs text-red-600 font-medium">{error}</div>}

        <button
          onClick={submit}
          disabled={busy || selected.length === 0}
          className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-sm font-bold transition"
        >
          {busy ? 'Processant…' : isMove ? 'Moure' : `Copiar${selected.length > 1 ? ` a ${selected.length} grups` : ''}`}
        </button>
      </div>
    </Modal>
  );
};
