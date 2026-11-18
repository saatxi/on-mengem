import React, { createContext, useContext, useEffect } from 'react';
import { readPersistent, usePersistentState } from '../hooks/usePersistentState';
import { DEFAULT_STYLE, getStyle, isStyleId, type StyleId } from '../styles/registry';

interface StyleContextType {
  style: StyleId;
  setStyle: (style: StyleId) => void;
}

const StyleContext = createContext<StyleContextType | null>(null);

const STORAGE_KEY = 'style';

/** Aplica l'estil a l'arrel: l'atribut data-style que fan servir els fitxers de src/styles/, el color de la barra i les fonts. */
export const applyStyle = (id: StyleId) => {
  const definition = getStyle(id);
  const root = document.documentElement;
  if (id === DEFAULT_STYLE) delete root.dataset.style;
  else root.dataset.style = id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', definition.themeColor);
  void definition.loadFonts?.().catch(() => {
    // Sense xarxa i sense la font a la memòria cau: es queda amb la lletra del sistema
  });
};

/** Estil desat d'aquest navegador. S'usa abans de pintar (main.tsx) perquè no es vegi un parpelleig de l'estil per defecte. */
export const readStoredStyle = (): StyleId => readPersistent(STORAGE_KEY, DEFAULT_STYLE, isStyleId);

export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [style, setStyle] = usePersistentState<StyleId>(STORAGE_KEY, DEFAULT_STYLE, isStyleId);

  useEffect(() => {
    applyStyle(style);
  }, [style]);

  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
};

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error('useStyle must be used within a StyleProvider');
  }
  return context;
}
