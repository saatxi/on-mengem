import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Restaurant, Visit } from '../types';
import {
  canEditVisit,
  INSTAGRAM_INPUT_PATTERN,
  isInstagramHandle,
  localToday,
  safeHttpUrl,
  toInstagramHandle,
  visitAverage,
} from './restaurantFields';

const visit = (overrides: Partial<Visit>): Visit => ({
  id: 'v1',
  restaurantId: 'r1',
  groupId: 'g1',
  shared: true,
  attendeeIds: [],
  ...overrides,
});

describe('toInstagramHandle', () => {
  it.each([
    ['usuari', 'usuari'],
    ['@usuari', 'usuari'],
    ['  @usuari  ', 'usuari'],
    ['instagram.com/usuari', 'usuari'],
    ['https://www.instagram.com/usuari/', 'usuari'],
    ['http://instagram.com/usuari?igsh=abc', 'usuari'],
    ['HTTPS://WWW.INSTAGRAM.COM/el.restaurant_bcn#top', 'el.restaurant_bcn'],
  ])('«%s» -> «%s»', (input, handle) => {
    expect(toInstagramHandle(input)).toBe(handle);
  });

  it('retorna un nom vàlid per a tot el que accepta el patró del formulari', () => {
    const pattern = new RegExp(`^(?:${INSTAGRAM_INPUT_PATTERN})$`, 'v');
    for (const input of ['@usuari', 'usuari', 'www.instagram.com/usuari/', 'https://instagram.com/usuari?x=1']) {
      expect(pattern.test(input)).toBe(true);
      expect(isInstagramHandle(toInstagramHandle(input))).toBe(true);
    }
  });
});

describe('isInstagramHandle', () => {
  it('accepta noms de fins a 30 caràcters de [A-Za-z0-9._]', () => {
    expect(isInstagramHandle('el.restaurant_bcn')).toBe(true);
    expect(isInstagramHandle('a'.repeat(30))).toBe(true);
  });

  it('rebutja buits, massa llargs o amb caràcters que podrien alterar l\'URL', () => {
    expect(isInstagramHandle(undefined)).toBe(false);
    expect(isInstagramHandle('')).toBe(false);
    expect(isInstagramHandle('a'.repeat(31))).toBe(false);
    expect(isInstagramHandle('usuari/../x')).toBe(false);
    expect(isInstagramHandle('usuari?x=1')).toBe(false);
  });
});

describe('safeHttpUrl', () => {
  it('conserva els enllaços http(s)', () => {
    expect(safeHttpUrl('https://example.com')).toBe('https://example.com');
    expect(safeHttpUrl('HTTP://example.com')).toBe('HTTP://example.com');
  });

  it('descarta altres esquemes i valors buits', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('data:text/html,hola')).toBeUndefined();
    expect(safeHttpUrl('example.com')).toBeUndefined();
    expect(safeHttpUrl('')).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});

describe('localToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dona la data en hora local, amb zeros a l\'esquerra', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0));
    expect(localToday()).toBe('2026-01-05');
  });

  it('just després de mitjanit ja és el dia nou (toISOString encara donaria ahir a l\'est d\'UTC)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 0, 30));
    expect(localToday()).toBe('2026-03-01');
  });
});

describe('canEditVisit', () => {
  it('a l\'espai personal només l\'autor', () => {
    expect(canEditVisit(visit({ groupId: null, createdBy: 'alice' }), 'alice')).toBe(true);
    expect(canEditVisit(visit({ groupId: null, createdBy: 'alice' }), 'bob')).toBe(false);
  });

  it('en un grup, una visita grupal la pot editar qualsevol membre', () => {
    expect(canEditVisit(visit({ shared: true, createdBy: 'alice' }), 'bob')).toBe(true);
  });

  it('en un grup, una visita privada només l\'autor, o tothom si l\'autor ha esborrat el compte', () => {
    expect(canEditVisit(visit({ shared: false, createdBy: 'alice' }), 'alice')).toBe(true);
    expect(canEditVisit(visit({ shared: false, createdBy: 'alice' }), 'bob')).toBe(false);
    expect(canEditVisit(visit({ shared: false, createdBy: undefined }), 'bob')).toBe(true);
  });
});

describe('visitAverage', () => {
  const restaurant = (visits: Visit[]): Restaurant => ({ id: 'r1', name: 'R', groupId: null, visits });

  it('fa la mitjana només de les visites valorades', () => {
    expect(visitAverage(restaurant([visit({ rating: 4 }), visit({ rating: 5 }), visit({})]))).toBe(4.5);
  });

  it('ignora les valoracions de 0 i retorna null si no n\'hi ha cap', () => {
    expect(visitAverage(restaurant([visit({ rating: 0 }), visit({})]))).toBeNull();
    expect(visitAverage(restaurant([]))).toBeNull();
  });
});
