import React, { useState } from 'react';
import { LogOut, Check, Trash2, UserRound, Monitor, Sun, Moon } from 'lucide-react';
import { Modal, ModalHeader } from './Modal';
import { useAlert, useConfirm } from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { quotaErrorMessage } from '../supabase/errors';
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { FIELD, LABEL } from '../utils/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Clar', icon: Sun },
  { value: 'dark', label: 'Fosc', icon: Moon },
];

const FOOD_AVATARS = ['🍕', '🍣', '🥘', '🍷', '🌮', '🍔', '🥗', '🍜', '🥑', '🥞', '☕', '🍰'];

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userProfile, updateProfile, logout, deleteAccount, authUser } = useAuth();
  const { theme, setTheme } = useTheme();
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
      setSaveError(quotaErrorMessage(err) ?? 'No s\'ha pogut desar el perfil. Comprova la connexió i torna-ho a provar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal label="El teu perfil" onClose={onClose}>
      <ModalHeader title="El teu perfil" icon={UserRound} onClose={onClose} />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Compte de Google */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
          {authUser?.photoURL ? (
            <img
              src={authUser.photoURL}
              referrerPolicy="no-referrer"
              alt=""
              className="size-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="size-10 rounded-full bg-accent-soft flex items-center justify-center text-xl shrink-0">
              {userProfile?.avatar || '🍕'}
            </span>
          )}
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-stone-800 truncate">{authUser?.displayName || userProfile?.nickname}</p>
            <p className="text-stone-500 truncate">{authUser?.email || 'Sense correu associat'}</p>
          </div>
        </div>

        {/* Form to update display name / avatar */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={LABEL}>
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
              className={FIELD}
            />
          </div>

          <div>
            <label className={cn(LABEL, 'mb-2')}>
              Tria el teu avatar culinari
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FOOD_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`h-10 rounded-2xl text-xl flex items-center justify-center transition ${
                    avatar === emoji
                      ? 'bg-accent-soft ring-2 ring-accent scale-105'
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
              className="px-4 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-card disabled:opacity-50 transition"
            >
              {isSaving ? 'Guardant...' : savedSuccess ? 'Guardat!' : 'Desar el perfil'}
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

        {/* Tema (només en aquest navegador) */}
        <div>
          <p className={LABEL}>Aparença</p>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 text-xs font-semibold" role="group" aria-label="Aparença">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 rounded-lg transition',
                  theme === value ? 'bg-surface text-stone-900 shadow-card' : 'text-stone-600 hover:text-stone-900',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-xs">
          <span className="text-stone-500 text-xs font-mono">
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
            <h3 className="text-xs font-semibold text-red-700">Eliminar el compte</h3>
            <p className="mt-1 text-xs text-stone-600">
              Esborra el teu perfil i el teu espai personal. Aquesta acció no es pot desfer.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-red-300 bg-surface text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold disabled:opacity-50 transition"
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
