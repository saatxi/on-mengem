import { describe, expect, it } from 'vitest';
import type { Tables } from './database';
import { restaurantToRow, toRestaurant, toWishlistItem, wishlistToRow } from './mappers';

const restaurantRow = (overrides: Partial<Tables<'restaurants'>> = {}): Tables<'restaurants'> => ({
  id: 'r1',
  group_id: null,
  name: 'Can Pere',
  cuisine: null,
  price_range: null,
  address: null,
  lat: null,
  lng: null,
  rating: null,
  notes: null,
  link: null,
  instagram: null,
  favorite: false,
  created_by: 'alice',
  created_by_name: 'Alice',
  recommended_by: null,
  wish_fulfilled_at: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
  ...overrides,
});

const visitRow = (id: string, visited_on: string | null, created_at: string) => ({
  id,
  restaurant_id: 'r1',
  group_id: null,
  visited_on,
  rating: null,
  notes: null,
  shared: true,
  created_by: 'alice',
  created_by_name: 'Alice',
  recommended_by: null,
  wish_fulfilled_at: null,
  created_at,
  updated_at: created_at,
  visit_attendees: [{ user_id: 'alice' }],
});

describe('toRestaurant', () => {
  it('converteix els NULL de la BD en undefined', () => {
    const r = toRestaurant(restaurantRow({ created_by: null, created_by_name: null }));
    expect(r.cuisine).toBeUndefined();
    expect(r.rating).toBeUndefined();
    expect(r.createdBy).toBeUndefined();
    expect(r.groupId).toBeNull();
  });

  it('ordena les visites de la més recent a la més antiga, amb les que no tenen data al final', () => {
    const r = toRestaurant({
      ...restaurantRow(),
      restaurant_visits: [
        visitRow('antiga', '2025-05-01', '2025-05-01T20:00:00Z'),
        visitRow('sense-data-1', null, '2024-01-01T10:00:00Z'),
        visitRow('recent', '2026-02-10', '2026-02-10T20:00:00Z'),
        visitRow('sense-data-2', null, '2024-06-01T10:00:00Z'),
      ],
    });
    expect(r.visits.map((v) => v.id)).toEqual(['recent', 'antiga', 'sense-data-2', 'sense-data-1']);
    expect(r.visits[0].attendeeIds).toEqual(['alice']);
  });

  it('accepta files sense visites incrustades (p. ex. de Realtime)', () => {
    expect(toRestaurant(restaurantRow()).visits).toEqual([]);
  });

  it('mapeja les coordenades i les deixa undefined si no en té', () => {
    expect(toRestaurant(restaurantRow({ lat: 41.4, lng: 2.15 }))).toMatchObject({ lat: 41.4, lng: 2.15 });
    expect(toRestaurant(restaurantRow()).lat).toBeUndefined();
  });
});

describe('toWishlistItem', () => {
  it('mapeja les columnes snake_case', () => {
    const item = toWishlistItem({
      id: 'w1',
      group_id: 'g1',
      restaurant_name: 'Sushi Bar',
      cuisine: 'Japonesa',
      price_range: null,
      recommended_by: 'Maria',
      address: 'Carrer Gran, 1',
      lat: 41.98,
      lng: 2.82,
      notes: null,
      link: null,
      instagram: null,
      status: 'planned',
      user_id: 'bob',
      user_name: 'Bob',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    });
    expect(item).toMatchObject({ restaurantName: 'Sushi Bar', recommendedBy: 'Maria', status: 'planned', groupId: 'g1', lat: 41.98, lng: 2.82 });
    expect(item.priceRange).toBeUndefined();
  });
});

describe('restaurantToRow / wishlistToRow', () => {
  it('converteix a snake_case i no envia les claus absents', () => {
    const row = restaurantToRow({ priceRange: '10-20 €', favorite: true });
    expect(JSON.parse(JSON.stringify(row))).toEqual({ price_range: '10-20 €', favorite: true });
  });

  it('envia els valors buits que sí hi són (per esborrar un camp)', () => {
    const row = wishlistToRow({ restaurantName: 'X', notes: '' });
    expect(JSON.parse(JSON.stringify(row))).toEqual({ restaurant_name: 'X', notes: '' });
  });
});
