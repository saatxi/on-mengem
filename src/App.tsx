import React, { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UpdateProvider } from './context/UpdateContext';
import { DialogProvider } from './components/ConfirmDialog';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { takePendingRestaurantId } from './hooks/useRestaurantLink';
import { Utensils } from 'lucide-react';

// La pantalla principal només es descarrega amb la sessió iniciada: l'inici de sessió carrega menys JS.
const MainApp = lazy(() => import('./MainApp').then((m) => ({ default: m.MainApp })));

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4">
    <div className="w-14 h-14 rounded-2xl bg-brand shadow-lg shadow-accent/30 flex items-center justify-center text-white animate-pulse mb-4">
      <Utensils className="w-6 h-6" />
    </div>
    <p className="text-sm font-semibold text-stone-600">Connectant amb On mengem?...</p>
  </div>
);

function AppGate() {
  const { hasProfile, isLoading } = useAuth();

  // Desa l'enllaç directe (?r=) abans del login amb Google, que tornaria a l'arrel sense el paràmetre
  useEffect(() => {
    takePendingRestaurantId();
  }, []);

  if (isLoading) return <LoadingScreen />;

  // If new user with no profile, show onboarding
  if (!hasProfile) return <WelcomeOnboarding />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <MainApp />
    </Suspense>
  );
}

export function App() {
  return (
    <ThemeProvider>
      {/* A l'arrel perquè el Service Worker es registri també a la càrrega i a l'onboarding */}
      <UpdateProvider>
        <AuthProvider>
          <DialogProvider>
            <AppGate />
          </DialogProvider>
        </AuthProvider>
      </UpdateProvider>
    </ThemeProvider>
  );
}
