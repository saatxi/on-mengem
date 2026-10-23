/** Errcode que fan servir els triggers de quotes (supabase/migrations/0009_abuse_quotas.sql). */
const QUOTA_EXCEEDED_CODE = 'OMQ01';

/** Si l'error és d'una quota, retorna el missatge del servidor (ja en català i amb el límit); si no, null. */
export function quotaErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === QUOTA_EXCEEDED_CODE && typeof message === 'string' ? message : null;
}
