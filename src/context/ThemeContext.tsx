import React, { createContext, useContext, useEffect } from 'react';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';

const THEMES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEMES)[number];

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// «system» treu l'atribut i el CSS segueix prefers-color-scheme; així no cal JavaScript per al tema del sistema
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = usePersistentState<ThemePreference>('theme', 'system', oneOf(...THEMES));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
