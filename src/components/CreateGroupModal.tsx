import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Modal, ModalHeader } from './Modal';
import { useAuth } from '../context/AuthContext';
import { quotaErrorMessage } from '../supabase/errors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createGroup } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createGroup(name.trim(), description.trim());
      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      console.error(err);
      setError(quotaErrorMessage(err) ?? 'No s\'ha pogut crear el grup. Torna-ho a provar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label="Crear un grup" onClose={handleClose}>
      <ModalHeader title="Crear un grup" icon={Users} onClose={handleClose} />

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Nom del grup *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Gourmet BCN, Sopars de Divendres, Família..."
            required
            maxLength={80}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-surface text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">
            Descripció o propòsit (opcional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. Restaurants recomanats per a reunions i sortides de cap de setmana."
            maxLength={300}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-surface text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
          />
        </div>

        <div className="p-3 rounded-xl bg-orange-50 text-xs text-orange-900 border border-orange-200">
          Es generarà automàticament un <strong>codi d'invitació de 6 caràcters</strong> que podràs compartir per WhatsApp o missatgeria amb els teus amics perquè s'hi uneixin a l'instant.
        </div>

        {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-sm font-bold text-white shadow-md disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Creant...' : 'Crear grup'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
