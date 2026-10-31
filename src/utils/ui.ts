// Classes compartides perquè tots els camps i targetes de l'app tinguin el mateix aspecte

/** Input, select o textarea dels formularis. */
export const FIELD =
  'w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-surface text-sm text-stone-900 placeholder:text-stone-400 focus:border-accent focus:ring-4 focus:ring-accent/15 outline-hidden transition-[border-color,box-shadow]';

/** Etiqueta d'un camp de formulari. */
export const LABEL = 'flex items-center gap-1 mb-1.5 text-sm font-semibold text-stone-700';

/** Superfície de targeta: ombra en clar i una vora fina que es veu en fosc. */
export const CARD = 'bg-surface rounded-3xl shadow-card ring-1 ring-stone-900/5';

/** Selector petit en forma de píndola de les barres de filtres (cuina, zona). */
export const CHIP_SELECT =
  'px-3.5 py-2 rounded-full bg-surface ring-1 ring-stone-200 text-xs text-stone-700 font-medium focus:ring-2 focus:ring-accent outline-hidden';

/** Estat buit d'una llista (sense resultats o encara sense elements). */
export const EMPTY_STATE = `${CARD} py-16 px-8 text-center space-y-3`;
