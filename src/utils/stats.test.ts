import { describe, expect, it } from 'vitest';
import type { Restaurant, Visit, WishlistItem } from '../types';
import {
  cuisineRows,
  daysSinceLastVisit,
  filterByPeriod,
  forgotten,
  monthStreak,
  mostRepeated,
  priceBreakdown,
  topRated,
  visitsByMonth,
  yearsWithVisits,
  yearSummary,
  yearSummaryText,
} from './stats';

let nextId = 0;

const visit = (visitedOn?: string, rating?: number): Visit => ({
  id: `v${nextId++}`,
  restaurantId: 'r',
  groupId: null,
  visitedOn,
  rating,
  shared: false,
  attendeeIds: [],
});

const restaurant = (name: string, overrides: Partial<Restaurant> = {}): Restaurant => ({
  id: name,
  name,
  groupId: null,
  visits: [],
  ...overrides,
});

const now = new Date('2026-10-23T12:00:00');

describe('visitsByMonth', () => {
  it('retorna els darrers mesos amb zeros i ignora les visites sense data o fora del període', () => {
    const list = [
      restaurant('A', { visits: [visit('2026-10-01'), visit('2026-08-15'), visit(undefined), visit('2025-10-31')] }),
      restaurant('B', { visits: [visit('2026-10-20')] }),
    ];
    expect(visitsByMonth(list, now, 3)).toEqual([
      { month: '2026-08', count: 1 },
      { month: '2026-09', count: 0 },
      { month: '2026-10', count: 2 },
    ]);
  });

  it('per defecte en retorna 12, acabant pel mes en curs', () => {
    const months = visitsByMonth([], now);
    expect(months).toHaveLength(12);
    expect(months[0].month).toBe('2025-11');
    expect(months[11].month).toBe('2026-10');
  });
});

describe('daysSinceLastVisit', () => {
  it('compta els dies des de la visita més recent de tots els restaurants', () => {
    const list = [restaurant('A', { visits: [visit('2026-10-01')] }), restaurant('B', { visits: [visit('2026-10-20'), visit(undefined)] })];
    expect(daysSinceLastVisit(list, now)).toBe(3);
  });

  it('avui és 0 i sense visites amb data és null', () => {
    expect(daysSinceLastVisit([restaurant('A', { visits: [visit('2026-10-23')] })], now)).toBe(0);
    expect(daysSinceLastVisit([restaurant('A', { visits: [visit(undefined)] })], now)).toBeNull();
  });
});

describe('monthStreak', () => {
  it('compta mesos seguits i travessa el canvi d\'any', () => {
    const list = [restaurant('A', { visits: ['2026-02-01', '2026-01-10', '2025-12-24', '2025-10-01'].map((d) => visit(d)) })];
    expect(monthStreak(list, new Date('2026-02-15T12:00:00'))).toBe(3);
  });

  it('si el mes en curs encara no té visites, compta des de l\'anterior', () => {
    const list = [restaurant('A', { visits: [visit('2026-09-10'), visit('2026-08-01')] })];
    expect(monthStreak(list, now)).toBe(2);
  });

  it('sense visites recents és 0', () => {
    expect(monthStreak([restaurant('A', { visits: [visit('2026-07-01')] })], now)).toBe(0);
  });
});

describe('rànquings', () => {
  const list = [
    restaurant('Baix', { visits: [visit('2026-01-01', 2)] }),
    restaurant('Alt', { visits: [visit('2026-01-01', 5), visit('2026-02-01', 4)] }),
    restaurant('Desat', { rating: 4.8 }),
    restaurant('Sense nota', { visits: [visit('2026-03-01'), visit('2026-04-01'), visit('2026-05-01')] }),
  ];

  it('topRated ordena per la nota que es mostra i deixa fora els que no en tenen', () => {
    expect(topRated(list).map(({ restaurant: r, value }) => [r.name, value])).toEqual([
      ['Desat', 4.8],
      ['Alt', 4.5],
      ['Baix', 2],
    ]);
  });

  it('mostRepeated només inclou els que tenen dues visites o més', () => {
    expect(mostRepeated(list).map(({ restaurant: r, value }) => [r.name, value])).toEqual([
      ['Sense nota', 3],
      ['Alt', 2],
    ]);
  });

  it('forgotten vol nota de 4 o més i la darrera visita de fa més de 6 mesos', () => {
    const candidates = [
      restaurant('Fa molt', { visits: [visit('2025-10-01', 5)] }),
      restaurant('Just al límit', { visits: [visit('2026-04-23', 5)] }),
      restaurant('Fa poc', { visits: [visit('2026-09-01', 5)] }),
      restaurant('Fluix', { visits: [visit('2025-01-01', 3)] }),
      restaurant('Fa una mica', { visits: [visit('2026-03-01', 4)] }),
    ];
    expect(forgotten(candidates, now).map(({ restaurant: r }) => r.name)).toEqual(['Fa molt', 'Fa una mica']);
  });
});

describe('priceBreakdown', () => {
  it('compta per franja i tria la més barata que arriba a la nota mitjana', () => {
    const { rows, bestValue } = priceBreakdown([
      restaurant('A', { priceRange: '1-10 €', rating: 3 }),
      restaurant('B', { priceRange: '10-20 €', rating: 4.5 }),
      restaurant('C', { priceRange: '10-20 €' }),
      restaurant('D', { priceRange: '30-40 €', rating: 5 }),
      restaurant('E'),
    ]);
    expect(rows.find((r) => r.range === '10-20 €')).toEqual({ range: '10-20 €', count: 2, rating: 4.5 });
    expect(rows.find((r) => r.range === '20-30 €')).toEqual({ range: '20-30 €', count: 0, rating: null });
    expect(bestValue).toBe('10-20 €');
  });

  it('sense notes no hi ha franja recomanada', () => {
    expect(priceBreakdown([restaurant('A', { priceRange: '1-10 €' })]).bestValue).toBeNull();
  });
});

describe('cuisineRows', () => {
  it('agrupa per cuina, amb «Altres» per als que no en tenen', () => {
    const rows = cuisineRows([
      restaurant('A', { cuisine: 'Italiana', favorite: true, visits: [visit('2026-01-01', 4)] }),
      restaurant('B', { cuisine: 'Italiana', rating: 3 }),
      restaurant('C'),
    ]);
    expect(rows).toEqual([
      { cuisine: 'Italiana', visits: 1, favorites: 1, total: 2, rating: 3.5 },
      { cuisine: 'Altres', visits: 0, favorites: 0, total: 1, rating: null },
    ]);
  });
});

describe('filterByPeriod', () => {
  const list = [
    restaurant('Aquest any', { visits: [visit('2026-03-01'), visit('2025-05-01')] }),
    restaurant('L\'any passat', { visits: [visit('2025-05-01')] }),
    restaurant('Sense visites'),
  ];

  it('amb «all» no canvia res', () => {
    expect(filterByPeriod(list, 'all', now)).toBe(list);
  });

  it('amb «year» deixa els visitats aquest any i només les visites d\'aquest any', () => {
    const filtered = filterByPeriod(list, 'year', now);
    expect(filtered.map((r) => r.name)).toEqual(['Aquest any']);
    expect(filtered[0].visits.map((v) => v.visitedOn)).toEqual(['2026-03-01']);
  });
});

describe('yearSummary', () => {
  const list = [
    restaurant('Trattoria', { cuisine: 'Italiana', visits: [visit('2026-03-01', 4), visit('2026-03-20', 5), visit('2025-01-01', 2)] }),
    restaurant('Sushi', { cuisine: 'Japonesa', visits: [visit('2026-07-01', 3)] }),
    restaurant('Vell', { cuisine: 'Catalana', visits: [visit('2024-06-01', 5)] }),
  ];
  const wishlist: WishlistItem[] = [
    { id: 'w1', restaurantName: 'X', groupId: null, status: 'visited', updatedAt: '2026-05-01T10:00:00Z' },
    { id: 'w2', restaurantName: 'Y', groupId: null, status: 'pending', updatedAt: '2026-05-01T10:00:00Z' },
  ];

  it('resumeix les visites de l\'any', () => {
    expect(yearSummary(list, wishlist, 2026)).toEqual({
      year: 2026,
      visits: 3,
      restaurants: 2,
      newRestaurants: 1,
      topCuisine: { cuisine: 'Italiana', visits: 2 },
      mostRepeated: { name: 'Trattoria', visits: 2 },
      bestRated: { name: 'Trattoria', rating: 4.5 },
      busiestMonth: { month: 2, visits: 2 },
      wishesFulfilled: 1,
    });
  });

  it('un any sense visites queda buit', () => {
    expect(yearSummary(list, [], 2020)).toEqual({
      year: 2020,
      visits: 0,
      restaurants: 0,
      newRestaurants: 0,
      topCuisine: null,
      mostRepeated: null,
      bestRated: null,
      busiestMonth: null,
      wishesFulfilled: 0,
    });
  });

  it('yearsWithVisits llista els anys del més recent al més antic', () => {
    expect(yearsWithVisits(list)).toEqual([2026, 2025, 2024]);
  });

  it('yearSummaryText només inclou les línies amb dades', () => {
    const text = yearSummaryText(yearSummary(list, wishlist, 2026), 'Amics');
    expect(text.split('\n')).toEqual([
      'El 2026 de «Amics» en xifres 🍽️',
      '3 visites a 2 restaurants (1 de nous)',
      'Cuina preferida: Italiana',
      'Més repetit: Trattoria (2 cops)',
      'Millor nota: Trattoria (4.5 ★)',
      `Mes més actiu: ${new Date(2000, 2, 1).toLocaleDateString('ca', { month: 'long' })}`,
      '1 desitjat complert',
    ]);
    expect(yearSummaryText(yearSummary(list, [], 2020)).split('\n')).toEqual(['El 2020 en xifres 🍽️', '0 visites a 0 restaurants (0 de nous)']);
  });
});
