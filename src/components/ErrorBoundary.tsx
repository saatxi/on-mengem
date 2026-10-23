import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Els límits d'error de React només es poden escriure com a classe.
// Sense aquest component, un error de render deixa la pantalla en blanc.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Error inesperat a la interfície:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <UtensilsCrossed className="w-10 h-10 mb-3 text-accent" />
        <h1 className="text-lg font-bold text-stone-900">Alguna cosa ha anat malament</h1>
        <p className="mt-1 text-sm text-stone-600 max-w-sm">
          L'app ha trobat un error inesperat. Torna-la a carregar; les teves dades estan desades al servidor.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-bold transition"
        >
          Tornar a carregar
        </button>
      </div>
    );
  }
}
