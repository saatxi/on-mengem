import React, { useState } from 'react';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalHeader } from './Modal';
import { useAuth } from '../context/AuthContext';
import { LABEL } from '../utils/ui';

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
    <Modal label="Unir-se a un grup" onClose={onClose}>
      <ModalHeader title="Unir-se a un grup" icon={UserPlus} onClose={onClose} />

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        <div>
          <label className={LABEL}>Codi d'invitació</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex. 6 caràcters (ex. BCN79X)"
            required
            maxLength={12}
            className="w-full px-3.5 py-3 rounded-2xl border border-stone-200 bg-surface text-lg text-stone-900 placeholder:text-stone-400 focus:border-accent focus:ring-4 focus:ring-accent/15 outline-hidden transition font-mono font-bold tracking-widest text-center uppercase"
          />
          <p className="mt-1 text-xs text-stone-500 text-center">Demana el codi a l'administrador o creador del grup.</p>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
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
          <Button type="button" onClick={onClose} variant="secondary" size="lg" className="flex-1">
            Cancel·lar
          </Button>
          <Button type="submit" disabled={isSubmitting || !code.trim()} variant="primary" size="lg" className="flex-1">
            {isSubmitting ? 'Connectant...' : 'Unir-me al grup'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
