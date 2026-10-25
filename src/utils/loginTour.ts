// La guia de benvinguda només surt després d'iniciar sessió, no en tornar a l'app amb la sessió oberta.
// Es marca just abans d'anar a Google: sessionStorage és de la pestanya i sobreviu a l'anada i tornada de l'OAuth.
const KEY = 'on-mengem:login-tour';

export const markLoginTourPending = () => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Sense emmagatzematge (mode privat estricte): simplement no surt la guia
  }
};

/** Retorna si cal mostrar la guia i esborra la marca, perquè només surti un cop per inici de sessió. */
export const consumeLoginTourPending = (): boolean => {
  try {
    const pending = sessionStorage.getItem(KEY) === '1';
    sessionStorage.removeItem(KEY);
    return pending;
  } catch {
    return false;
  }
};
