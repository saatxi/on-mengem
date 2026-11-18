import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyStyle, readStoredStyle } from './context/StyleContext';
// Font autoallotjada de l'estil per defecte: funciona offline (PWA) i no envia la IP dels visitants a Google
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';

// L'estil desat s'aplica abans de pintar, perquè no es vegi l'estil per defecte un instant
applyStyle(readStoredStyle());

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
