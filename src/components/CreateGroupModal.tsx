import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalHeader } from './Modal';
import { useAuth } from '../context/AuthContext';
import { quotaErrorMessage } from '../supabase/errors';
import { FIELD, LABEL } from '../utils/ui';

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
      setError(quotaErrorMessage(err) ?? "No s'ha pogut crear el grup. Torna-ho a provar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label="Crear un grup" onClose={handleClose}>
      <ModalHeader title="Crear un grup" icon={Users} onClose={handleClose} />

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        <div>
          <label className={LABEL}>Nom del grup *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Gourmet BCN, Sopars de Divendres, Família..."
            required
            maxLength={80}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL}>Descripció o propòsit (opcional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. Restaurants recomanats per a reunions i sortides de cap de setmana."
            maxLength={300}
            className={FIELD}
          />
        </div>

        <div className="p-3 rounded-2xl bg-accent-soft text-xs text-orange-900 border border-orange-200">
          Es generarà automàticament un <strong>codi d'invitació de 6 caràcters</strong> que podràs compartir per WhatsApp o missatgeria amb
          els teus amics perquè s'hi uneixin a l'instant.
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" onClick={handleClose} variant="secondary" size="lg" className="flex-1">
            Cancel·lar
          </Button>
          <Button type="submit" disabled={isSubmitting || !name.trim()} variant="primary" size="lg" className="flex-1">
            {isSubmitting ? 'Creant...' : 'Crear grup'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
