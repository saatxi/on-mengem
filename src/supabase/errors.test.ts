import { describe, expect, it } from 'vitest';
import { errorMessage, quotaErrorMessage } from './errors';

const FALLBACK = "No s'ha pogut completar l'acció.";

describe('quotaErrorMessage', () => {
  it('retorna el missatge de les quotes', () => {
    expect(quotaErrorMessage({ code: 'OMQ01', message: 'Has arribat al límit de 500 restaurants' })).toBe(
      'Has arribat al límit de 500 restaurants',
    );
  });

  it('no retorna res per a la resta d’errors', () => {
    expect(quotaErrorMessage({ code: 'P0001', message: 'Canvi no trobat' })).toBeNull();
    expect(quotaErrorMessage(null)).toBeNull();
    expect(quotaErrorMessage('error')).toBeNull();
  });
});

describe('errorMessage', () => {
  it('mostra el missatge de les excepcions de les funcions de la BD', () => {
    // Error de Supabase tal com arriba: un objecte, no un Error
    const error = { code: 'P0001', message: "Aquest restaurant ja no existeix. Recupera'l primer.", details: null, hint: null };
    expect(errorMessage(error, FALLBACK)).toBe("Aquest restaurant ja no existeix. Recupera'l primer.");
  });

  it('mostra el missatge de les quotes', () => {
    expect(errorMessage({ code: 'OMQ01', message: 'Has arribat al límit de 20 grups' }, FALLBACK)).toBe('Has arribat al límit de 20 grups');
  });

  it('mostra el missatge dels Error de l’app', () => {
    expect(errorMessage(new Error("No s'ha pogut esborrar el grup."), FALLBACK)).toBe("No s'ha pogut esborrar el grup.");
  });

  it('amaga els missatges tècnics', () => {
    expect(errorMessage({ code: '42501', message: 'new row violates row-level security policy' }, FALLBACK)).toBe(FALLBACK);
    expect(errorMessage({ code: '', message: 'TypeError: Failed to fetch' }, FALLBACK)).toBe(FALLBACK);
  });

  it('fa servir el text per defecte si no hi ha missatge', () => {
    expect(errorMessage({ code: 'P0001' }, FALLBACK)).toBe(FALLBACK);
    expect(errorMessage({ code: 'P0001', message: '' }, FALLBACK)).toBe(FALLBACK);
    expect(errorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
