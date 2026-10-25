import { describe, expect, it } from 'vitest';
import { parseNominatim } from './geocode';

describe('parseNominatim', () => {
  it('llegeix les coordenades del primer resultat (Nominatim les dona en text)', () => {
    expect(
      parseNominatim([
        { lat: '41.4030', lon: '2.1570' },
        { lat: '0', lon: '0' },
      ]),
    ).toEqual({ lat: 41.403, lng: 2.157 });
  });

  it('accepta coordenades numèriques', () => {
    expect(parseNominatim([{ lat: -33.86, lon: 151.21 }])).toEqual({ lat: -33.86, lng: 151.21 });
  });

  it('sense resultats, retorna null', () => {
    expect(parseNominatim([])).toBeNull();
    expect(parseNominatim({ error: 'Unable to geocode' })).toBeNull();
    expect(parseNominatim(null)).toBeNull();
  });

  it('descarta valors que no són coordenades vàlides', () => {
    expect(parseNominatim([{ lat: 'nord', lon: '2.15' }])).toBeNull();
    expect(parseNominatim([{ lat: '41.4' }])).toBeNull();
    expect(parseNominatim([{ lat: null, lon: null }])).toBeNull();
    expect(parseNominatim([{ lat: '', lon: '' }])).toBeNull();
    expect(parseNominatim([{ lat: '91', lon: '2.15' }])).toBeNull();
    expect(parseNominatim([{ lat: '41.4', lon: '-181' }])).toBeNull();
  });
});
