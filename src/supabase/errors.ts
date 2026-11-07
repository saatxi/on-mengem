/** Errcode que fan servir els triggers de quotes (supabase/migrations/0001_schema.sql). */
const QUOTA_EXCEEDED_CODE = 'OMQ01';

/** Errcode de `raise exception` sense codi propi: les funcions de la BD el fan servir amb missatges en català. */
const RAISED_EXCEPTION_CODE = 'P0001';

const codeAndMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return {};
  const { code, message } = error as { code?: unknown; message?: unknown };
  return { code, message: typeof message === 'string' ? message : undefined };
};

/** Si l'error és d'una quota, retorna el missatge del servidor (ja en català i amb el límit); si no, null. */
export function quotaErrorMessage(error: unknown): string | null {
  const { code, message } = codeAndMessage(error);
  return code === QUOTA_EXCEEDED_CODE && message ? message : null;
}

/**
 * Text per a l'usuari d'un error: el d'un `Error` de l'app, el d'una excepció de les funcions de la BD o el d'una quota
 * (tots en català); si no, `fallback`. Els errors de Supabase arriben com a objectes, no com a `Error`, i els altres
 * (RLS, xarxa…) tenen missatges tècnics en anglès que no s'han de mostrar.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  const { code, message } = codeAndMessage(error);
  return (code === RAISED_EXCEPTION_CODE || code === QUOTA_EXCEEDED_CODE) && message ? message : fallback;
}
