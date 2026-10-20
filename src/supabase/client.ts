import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Falten VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY. Copia .env.example a .env i omple\'ls.'
  );
}

// PKCE: Google torna un codi d'un sol ús (?code=) en lloc de deixar els tokens al fragment de la URL.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});
