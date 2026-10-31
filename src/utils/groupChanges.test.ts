import { describe, expect, it } from 'vitest';
import { changeTitle, deletedSummary, fieldChanges, formatFieldValue } from './groupChanges';
import { GroupChange } from '../types';

const change = (overrides: Partial<GroupChange>): GroupChange => ({
  id: 'c1',
  groupId: 'g1',
  itemType: 'restaurant',
  itemId: 'r1',
  itemName: 'Can Pep',
  action: 'update',
  oldData: {},
  createdAt: '2026-10-23T12:00:00Z',
  ...overrides,
});

const names: Record<string, string> = { u1: 'Marta', u2: 'Pau' };
const nameOf = (uid: string) => names[uid] ?? 'Antic membre';

describe('changeTitle', () => {
  it('diu qui ha fet què i a quin element', () => {
    expect(changeTitle(change({ changedByName: 'Joan' }))).toBe('Joan ha editat el restaurant «Can Pep»');
    expect(changeTitle(change({ itemType: 'wishlist', action: 'delete', changedByName: 'Joan' }))).toBe(
      'Joan ha esborrat el desitjat «Can Pep»',
    );
    expect(changeTitle(change({ itemType: 'visit', action: 'delete' }))).toBe('Algú ha esborrat una visita a «Can Pep»');
  });
});

describe('formatFieldValue', () => {
  it.each([
    ['notes', null, '—'],
    ['notes', '', '—'],
    ['favorite', true, 'Sí'],
    ['shared', false, 'Privada'],
    ['rating', 4.5, '4,5 ★'],
    ['status', 'planned', 'Planificat'],
    ['instagram', 'canpep', '@canpep'],
    ['attendees', ['u1', 'u3'], 'Marta, Antic membre'],
    ['attendees', [], '—'],
  ])('%s = %j -> «%s»', (field, value, text) => {
    expect(formatFieldValue(field, value, nameOf)).toBe(text);
  });

  it('retalla els textos llargs', () => {
    const text = formatFieldValue('notes', 'a'.repeat(200), nameOf);
    expect(text).toHaveLength(80);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('fieldChanges', () => {
  it("llista els camps canviats en l'ordre del formulari", () => {
    const c = change({ oldData: { rating: 4, name: 'Can Pep' }, newData: { rating: 2, name: 'Cal Pep' } });
    expect(fieldChanges(c, nameOf)).toEqual([
      { label: 'Nom', before: 'Can Pep', after: 'Cal Pep' },
      { label: 'Valoració', before: '4 ★', after: '2 ★' },
    ]);
  });

  it("un punt mogut al mapa surt com a canvi d'ubicació, sense coordenades", () => {
    const c = change({ oldData: { lat: 41.98, lng: 2.82 }, newData: { lat: 41.9801, lng: 2.8205 } });
    expect(fieldChanges(c, nameOf)).toEqual([{ label: 'Ubicació', before: 'Punt anterior', after: 'Punt mogut al mapa' }]);
    expect(fieldChanges({ ...c, itemType: 'wishlist' }, nameOf)).toEqual([
      { label: 'Ubicació', before: 'Punt anterior', after: 'Punt mogut al mapa' },
    ]);
  });

  it("amb un canvi d'adreça, les coordenades no fan una fila a part", () => {
    const c = change({
      oldData: { address: 'Carrer Gran, 1', lat: 41.98, lng: 2.82 },
      newData: { address: 'Plaça del Vi, 1', lat: 41.99, lng: 2.83 },
    });
    expect(fieldChanges(c, nameOf)).toEqual([{ label: 'Adreça', before: 'Carrer Gran, 1', after: 'Plaça del Vi, 1' }]);
  });

  it('un esborrat no té camps canviats', () => {
    expect(fieldChanges(change({ action: 'delete', oldData: { name: 'Can Pep' } }), nameOf)).toEqual([]);
  });
});

describe('deletedSummary', () => {
  it("compta les visites d'un restaurant esborrat", () => {
    expect(deletedSummary(change({ action: 'delete', oldData: { visits: [{}, {}] } }))).toBe('Amb 2 visites');
    expect(deletedSummary(change({ action: 'delete', oldData: { visits: [] } }))).toBeNull();
  });

  it('resumeix una visita esborrada', () => {
    const c = change({ itemType: 'visit', action: 'delete', oldData: { visited_on: null, rating: 3.5, shared: false } });
    expect(deletedSummary(c)).toBe('Visita sense data · 3,5 ★ · Privada');
  });
});
