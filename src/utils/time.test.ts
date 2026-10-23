import { describe, expect, it } from 'vitest';
import { timeAgo } from './time';

describe('timeAgo', () => {
  const now = new Date('2026-10-23T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;

  it.each([
    [30_000, 'ara mateix'],
    [5 * MIN, 'fa 5 min'],
    [3 * 60 * MIN, 'fa 3 h'],
    [30 * 60 * MIN, 'ahir'],
    [4 * 24 * 60 * MIN, 'fa 4 dies'],
  ])('fa %i ms -> «%s»', (ms, text) => {
    expect(timeAgo(ago(ms), now)).toBe(text);
  });

  it('a partir d\'una setmana mostra la data', () => {
    expect(timeAgo('2026-10-01T12:00:00Z', now)).toBe(new Date('2026-10-01T12:00:00Z').toLocaleDateString('ca', { day: 'numeric', month: 'short' }));
  });

  it('sense data retorna un text buit', () => {
    expect(timeAgo(undefined, now)).toBe('');
  });
});
