import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, getStyle, isStyleId, STYLES } from './registry';

describe("registre d'estils", () => {
  it("l'estil per defecte existeix i els ids són únics", () => {
    expect(isStyleId(DEFAULT_STYLE)).toBe(true);
    expect(new Set(STYLES.map((s) => s.id)).size).toBe(STYLES.length);
  });

  it('només accepta ids coneguts', () => {
    expect(isStyleId('guia')).toBe(true);
    expect(isStyleId('inexistent')).toBe(false);
    expect(isStyleId(null)).toBe(false);
  });

  it("getStyle retorna la definició de l'estil", () => {
    expect(getStyle('guia').label).toBe('Guia');
    expect(getStyle(DEFAULT_STYLE).themeColor).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
