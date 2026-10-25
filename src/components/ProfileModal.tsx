import React, { useState } from 'react';
import { LogOut, Check, Trash2, UserRound, Monitor, Sun, Moon, Compass } from 'lucide-react';
import { Modal, ModalHeader } from './Modal';
import { useAlert, useConfirm } from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { quotaErrorMessage } from '../supabase/errors';
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { FIELD, LABEL } from '../utils/ui';
import { Button } from './Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenTour: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Clar', icon: Sun },
  { value: 'dark', label: 'Fosc', icon: Moon },
];

const FOOD_AVATARS = ['🍕', '🍣', '🥘', '🍷', '🌮', '🍔', '🥗', '🍜', '🥑', '🥞', '☕', '🍰'];

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose, onOpenTour }) => {
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
        "Aquesta acció NO es pot desfer. S'esborraran el teu perfil i totes les dades del teu espai personal (restaurants i llista de desitjos).\n\n" +
        "El que hagis afegit als grups es mantindrà sense el teu nom d'usuari, i els grups dels quals siguis propietari passaran al membre més antic.",
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
      await showAlert("No s'ha pogut eliminar el compte.", 'Torna-ho a provar més tard.');
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
      setSaveError(quotaErrorMessage(err) ?? "No s'ha pogut desar el perfil. Comprova la connexió i torna-ho a provar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal label="El teu perfil" onClose={onClose}>
      <ModalHeader title="El teu perfil" icon={UserRound} onClose={onClose} />

      <div className="p-5 sm:p-6 space-y-6">
        {/* Compte de Google */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
          {authUser?.photoURL ? (
            <img src={authUser.photoURL} referrerPolicy="no-referrer" alt="" className="size-10 rounded-full object-cover shrink-0" />
          ) : (
            <span className="size-10 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center shrink-0">
              <UserRound className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-stone-800 truncate">{authUser?.displayName || userProfile?.nickname}</p>
            <p className="text-stone-500 truncate">{authUser?.email || 'Sense correu associat'}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (
                await confirm({
                  message: 'Vols tancar la sessió?',
                  details: 'Hauràs de tornar a entrar amb el teu compte de Google.',
                  confirmLabel: 'Tancar sessió',
                })
              ) {
                await logout();
                onClose();
              }
            }}
          >
            <LogOut className="size-3.5" />
            Tancar sessió
          </Button>
        </div>

        {/* Com et veuen els altres membres: nom i avatar */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="size-12 shrink-0 rounded-2xl bg-accent-soft flex items-center justify-center text-2xl">{avatar}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate">{nickname.trim() || 'El teu nom'}</p>
              <p className="text-xs text-stone-500">Així et veuen els altres membres dels grups</p>
            </div>
          </div>

          <div>
            <label htmlFor="profile-nickname" className={LABEL}>
              Nom
            </label>
            <input
              id="profile-nickname"
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
            <p className={LABEL}>Avatar</p>
            <div className="grid grid-cols-6 gap-2" role="group" aria-label="Avatar">
              {FOOD_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  aria-pressed={avatar === emoji}
                  className={cn(
                    'h-10 rounded-2xl text-xl flex items-center justify-center transition',
                    avatar === emoji ? 'bg-accent-soft ring-2 ring-accent' : 'bg-stone-100 hover:bg-stone-200',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isSaving || nickname.trim().length < 2}>
              {isSaving ? 'Desant...' : 'Desar'}
            </Button>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="size-4" /> Dades desades
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

        {/* Guia de benvinguda */}
        <button
          type="button"
          onClick={onOpenTour}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-left transition-colors"
        >
          <span className="size-9 shrink-0 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
            <Compass className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-900">Com funciona l'app</span>
            <span className="block text-xs text-stone-500">Torna a veure la guia de benvinguda</span>
          </span>
        </button>

        {/* Peu: versió i eliminar el compte (el diàleg de confirmació n'explica les conseqüències) */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3 text-xs">
          <span className="text-stone-400">Versió {__APP_VERSION__}</span>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-2 py-1 -mr-2 rounded-full text-stone-500 hover:text-red-600 hover:bg-red-50 font-semibold disabled:opacity-50 transition-colors"
          >
            <Trash2 className="size-3.5" />
            {isDeleting ? 'Eliminant...' : 'Eliminar el compte'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
