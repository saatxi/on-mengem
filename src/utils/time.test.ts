import { describe, expect, it } from 'vitest';
import { dayBucket, isInCurrentMonth, timeAgo } from './time';

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

  it("a partir d'una setmana mostra la data", () => {
    expect(timeAgo('2026-10-01T12:00:00Z', now)).toBe(
      new Date('2026-10-01T12:00:00Z').toLocaleDateString('ca', { day: 'numeric', month: 'short' }),
    );
  });

  it('sense data retorna un text buit', () => {
    expect(timeAgo(undefined, now)).toBe('');
  });
});

describe('isInCurrentMonth', () => {
  const now = new Date('2026-10-23T12:00:00');

  it.each([
    ['2026-10-01', true],
    ['2026-10-31', true],
    ['2026-09-30', false],
    ['2025-10-15', false],
    ['2026-10-05T09:00:00Z', true],
    [undefined, false],
  ])('%s -> %s', (date, expected) => {
    expect(isInCurrentMonth(date, now)).toBe(expected);
  });

  it('una data sola del dia 1 és del mes encara que en UTC sigui el mes anterior', () => {
    expect(isInCurrentMonth('2026-10-01', new Date('2026-10-01T00:30:00'))).toBe(true);
  });
});

describe('dayBucket', () => {
  // Divendres 23 d'octubre de 2026, a migdia (hora local)
  const now = new Date('2026-10-23T12:00:00');

  it.each([
    ['2026-10-23T08:00:00', 'Avui'],
    ['2026-10-22T23:30:00', 'Ahir'],
    ['2026-10-19T10:00:00', 'Aquesta setmana'],
    ['2026-10-18T10:00:00', 'Octubre'],
    ['2026-09-30T10:00:00', 'Setembre'],
    ['2025-12-31T10:00:00', 'Desembre 2025'],
  ])('%s -> «%s»', (date, bucket) => {
    expect(dayBucket(date, now)).toBe(bucket);
  });

  it('dilluns, el diumenge és «Ahir» i el dissabte ja és del mes', () => {
    const monday = new Date('2026-10-19T09:00:00');
    expect(dayBucket('2026-10-18T20:00:00', monday)).toBe('Ahir');
    expect(dayBucket('2026-10-17T20:00:00', monday)).toBe('Octubre');
  });

  it('un instant UTC es classifica pel dia local', () => {
    // 23:30 UTC del 22 = 01:30 del 23 a Madrid
    expect(dayBucket('2026-10-22T23:30:00Z', now)).toBe('Avui');
  });
});
