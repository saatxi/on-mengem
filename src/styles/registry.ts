// Estils visuals disponibles. Cada estil és un fitxer CSS d'aquesta carpeta (els valors dels tokens) més una entrada aquí.
// Els components no en depenen: només fan servir els tokens (vegeu classic.css). `classic` és l'estil per defecte i no
// necessita selector, perquè els seus valors són els de :root.

export interface StyleDefinition {
  id: string;
  label: string;
  /** Color de la barra del navegador (meta theme-color). */
  themeColor: string;
  /** Càrrega diferida de les fonts de l'estil: només es descarreguen si algú el tria. */
  loadFonts?: () => Promise<unknown>;
}

export const STYLES = [
  { id: 'classic', label: 'Clàssic', themeColor: '#f4511e' },
  { id: 'guia', label: 'Guia', themeColor: '#1d5c3f', loadFonts: () => import('./guia-fonts') },
  { id: 'neo', label: 'Neó', themeColor: '#0b0d1a', loadFonts: () => import('./neo-fonts') },
] as const satisfies readonly StyleDefinition[];

export type StyleId = (typeof STYLES)[number]['id'];

export const DEFAULT_STYLE: StyleId = 'classic';

export const STYLE_IDS = STYLES.map((s) => s.id);

export const isStyleId = (value: unknown): value is StyleId => typeof value === 'string' && STYLE_IDS.some((id) => id === value);

export const getStyle = (id: StyleId): StyleDefinition => STYLES.find((s) => s.id === id) ?? STYLES[0];
