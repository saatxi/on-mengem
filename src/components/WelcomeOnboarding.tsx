import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, CheckCircle2, BookmarkPlus, Users } from 'lucide-react';
import { DevLogin } from './DevLogin';

export const WelcomeOnboarding: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setLoginError('No s\'ha pogut completar l\'inici de sessió amb Google. Torna-ho a provar.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative isolate overflow-hidden min-h-screen flex flex-col justify-center items-center p-4">
      {/* Fons «aurora»: taques difuminades dels colors de marca que es mouen a poc a poc */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
        <div className="absolute -top-20 left-[10%] size-80 rounded-full bg-accent blur-3xl animate-drift-1" />
        <div className="absolute -bottom-28 right-[8%] size-80 rounded-full bg-accent-2 blur-3xl animate-drift-2" />
        <div className="absolute top-1/3 left-[55%] size-56 rounded-full bg-amber-400 blur-3xl animate-drift-3" />
      </div>
      <div className="w-full max-w-md bg-surface/85 backdrop-blur-xl rounded-[2rem] p-6 sm:p-9 shadow-2xl shadow-accent/10 ring-1 ring-stone-900/5 text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand text-white shadow-xl shadow-accent/30 mb-5 -rotate-6">
          <Utensils className="w-10 h-10" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">
          On mengem?
        </h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          L'aplicació per organitzar els teus restaurants preferits, la llista de desitjats i compartir-ho amb els teus grups en temps real.
        </p>

        {/* Features Checklist */}
        <div className="mt-6 mb-7 text-left space-y-2.5 p-4 rounded-3xl bg-stone-50 text-sm text-stone-700">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Catàleg de restaurants amb valoracions, notes i preus</span>
          </div>
          <div className="flex items-center gap-2.5">
            <BookmarkPlus className="w-4 h-4 text-violet-700 flex-shrink-0" />
            <span>Llista de desitjats per anar provant llocs nous</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-accent flex-shrink-0" />
            <span>Espai personal i grups compartits en temps real amb codi d'invitació</span>
          </div>
        </div>

        {/* Error message if any */}
        {loginError && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {loginError}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-full font-semibold text-stone-800 bg-surface hover:bg-stone-50 ring-1 ring-stone-200 shadow-card hover:shadow-card-hover transition-[background-color,box-shadow,transform] active:scale-[0.98] text-sm"
        >
          {googleLoading ? (
            <span className="text-stone-500">Iniciant sessió...</span>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continua amb Google</span>
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-stone-500">
          Autenticació oficial segura amb el teu compte de Google.
        </p>

        {/* Usuaris de supabase/seed.sql: el build de producció elimina aquest bloc */}
        {import.meta.env.MODE === 'localdb' && <DevLogin />}
      </div>
    </div>
  );
};
