import React, { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { supabase } from '../supabase/client';
import { Button } from './Button';
import { markLoginTourPending } from '../utils/loginTour';

// Usuaris de supabase/seed.sql. Aquest component només es renderitza en mode localdb (make dev),
// i el build de producció l'elimina.
const SEED_PASSWORD = 'onmengem';
const SEED_USERS = [
  { name: 'Marta', avatar: '🍣', email: 'marta@onmengem.local' },
  { name: 'Pau', avatar: '🍷', email: 'pau@onmengem.local' },
  { name: 'Laia', avatar: '🥗', email: 'laia@onmengem.local' },
  { name: 'Jordi', avatar: '🍔', email: 'jordi@onmengem.local' },
  { name: 'Núria', avatar: '🥞', email: 'nuria@onmengem.local' },
];

export const DevLogin: React.FC = () => {
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string) => {
    setLoadingEmail(email);
    setError(null);
    // onAuthStateChange (AuthContext) recull la sessió nova.
    markLoginTourPending();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: SEED_PASSWORD });
    if (authError) {
      console.error('Error iniciant sessió amb l\'usuari de prova:', authError);
      setError('No s\'ha pogut entrar. Has carregat les dades de prova amb make db-reset?');
      setLoadingEmail(null);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-dashed border-stone-200 text-left">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
        <FlaskConical className="w-3.5 h-3.5" />
        Només entorn local: usuaris de prova
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEED_USERS.map((user) => (
          <Button
            key={user.email}
            variant="secondary"
            size="sm"
            disabled={loadingEmail !== null}
            onClick={() => handleLogin(user.email)}
          >
            <span aria-hidden="true">{user.avatar}</span>
            {loadingEmail === user.email ? 'Entrant...' : user.name}
          </Button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
};
