import {createRoot} from 'react-dom/client';
import { App } from './App.tsx';
// Font autoallotjada: funciona offline (PWA) i no envia la IP dels visitants a Google
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
