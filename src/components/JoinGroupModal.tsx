import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinGroupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { joinGroupByCode } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await joinGroupByCode(code.trim());
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setTimeout(() => {
          onClose();
          setCode('');
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Hi ha hagut un error en connectar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-bold">Unir-se a un Grup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Codi d'Invitació del grup
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex. 6 caràcters (ex. BCN79X)"
              required
              maxLength={12}
              className="w-full px-3.5 py-3 rounded-xl border border-stone-300 font-mono font-bold tracking-widest text-center text-lg uppercase focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-stone-900 outline-hidden transition"
            />
            <p className="mt-1 text-xs text-stone-500 text-center">
              Demana el codi a l'administrador o creador del grup.
            </p>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white shadow-md disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Connectant...' : 'Unir-me al Grup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
