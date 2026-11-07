/**
 * Ordre de les respostes d'una mateixa lectura: si diverses peticions es solapen (un desat, un avís de Realtime…), poden
 * tornar desordenades i una de vella no ha de trepitjar una de més nova.
 *
 * Es crida en començar cada petició, i la funció que retorna es crida en rebre'n la resposta bona: diu si s'ha d'aplicar.
 * Només es descarta si ja s'ha aplicat la d'una petició posterior. No n'hi ha prou a mirar si és la darrera iniciada: qui
 * espera la lectura es quedaria sense dades mentre la nova és en curs, i les perdria del tot si la nova fallés.
 */
export const createResponseOrder = () => {
  let started = 0;
  let applied = 0;
  return () => {
    const request = ++started;
    return () => {
      if (request < applied) return false;
      applied = request;
      return true;
    };
  };
};
