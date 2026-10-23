import React, { useState } from 'react';
import { X, LogOut, Check, Mail, User, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { useAlert, useConfirm } from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FOOD_AVATARS = ['🍕', '🍣', '🥘', '🍷', '🌮', '🍔', '🥗', '🍜', '🥑', '🥞', '☕', '🍰'];

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userProfile, updateProfile, logout, deleteAccount, authUser } = useAuth();
  const [nickname, setNickname] = useState(userProfile?.nickname || '');
  const [avatar, setAvatar] = useState(userProfile?.avatar || '🍕');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();
  const showAlert = useAlert();

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      message: 'Vols eliminar el teu compte?',
      details:
        'Aquesta acció NO es pot desfer. S\'esborraran el teu perfil i totes les dades del teu espai personal (restaurants i llista de desitjos).\n\n' +
        'El que hagis afegit als grups es mantindrà sense el teu nom d\'usuari, i els grups dels quals siguis propietari passaran al membre més antic.',
      confirmLabel: 'Eliminar el compte',
      destructive: true,
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      console.error('Error eliminant el compte:', err);
      await showAlert('No s\'ha pogut eliminar el compte.', 'Torna-ho a provar més tard.');
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        nickname: nickname.trim().slice(0, 50),
        avatar,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setSaveError('No s\'ha pogut desar el perfil. Comprova la connexió i torna-ho a provar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal label="El teu perfil" onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
        <div className="flex items-center gap-3">
          {authUser?.photoURL ? (
            <img
              src={authUser.photoURL}
              referrerPolicy="no-referrer"
              alt="Avatar"
              className="w-9 h-9 rounded-full border-2 border-orange-500 object-cover"
            />
          ) : (
            <span className="text-2xl">{userProfile?.avatar || '🍕'}</span>
          )}
          <div>
            <h2 className="text-base font-bold">Compte Google</h2>
            <p className="text-xs text-stone-400">Usuari verificat a On menjem?</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Tanca"
          className="p-1.5 rounded-full text-stone-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Google Account Info Box */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-stone-700 font-semibold">
            <Mail className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="truncate">{authUser?.email || 'Sense correu associat'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <User className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="truncate">{authUser?.displayName || userProfile?.nickname}</span>
          </div>
        </div>

        {/* Form to update display name / avatar */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Nom que veuran els altres membres del grup
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="El teu àlies o nom"
              required
              minLength={2}
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-stone-900 text-sm font-medium outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Tria el teu avatar culinari
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FOOD_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center transition ${
                    avatar === emoji
                      ? 'bg-orange-100 ring-2 ring-orange-500 scale-105'
                      : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              disabled={isSaving || nickname.trim().length < 2}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs disabled:opacity-50 transition"
            >
              {isSaving ? 'Guardant...' : savedSuccess ? 'Guardat!' : 'Actualitzar Perfil'}
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Dades desades
              </span>
            )}
            {saveError && (
              <span role="alert" className="text-xs text-red-600 font-semibold">
                {saveError}
              </span>
            )}
          </div>
        </form>

        {/* Sign out */}
        <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-xs">
          <span className="text-stone-400 text-[10px] font-mono">
            Versió {__APP_VERSION__} · UID: {authUser?.uid.slice(0, 8)}...
          </span>
          <button
            onClick={async () => {
              if (await confirm({ message: 'Vols tancar la sessió?', details: 'Hauràs de tornar a entrar amb el teu compte de Google.', confirmLabel: 'Tancar sessió' })) {
                await logout();
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 text-stone-600 hover:text-red-600 font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Tancar sessió</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/50 space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">Eliminar el compte</h3>
            <p className="mt-1 text-xs text-stone-600">
              Esborra el teu perfil i el teu espai personal. Aquesta acció no es pot desfer.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 bg-surface text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold disabled:opacity-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Eliminant...' : 'Eliminar compte'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
