import { useEffect, useState } from 'react';

const PREFIX = 'on-mengem:';

const read = <T,>(key: string, initial: T, isValid: (value: unknown) => value is T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return initial;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : initial;
  } catch {
    return initial;
  }
};

/**
 * useState que es recorda entre visites (localStorage d'aquest navegador).
 * `isValid` descarta valors antics o manipulats; si l'emmagatzematge no està disponible, funciona com un useState normal.
 */
export function usePersistentState<T>(key: string, initial: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => read(key, initial, isValid));

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Mode privat o emmagatzematge ple: la preferència només dura aquesta sessió
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Validador per a valors que han de ser un dels de la llista. */
export const oneOf =
  <T extends string>(...options: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (options as readonly string[]).includes(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isString = (value: unknown): value is string => typeof value === 'string';
