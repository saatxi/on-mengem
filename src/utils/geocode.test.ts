import { describe, expect, it } from 'vitest';
import { parseNominatim } from './geocode';

describe('parseNominatim', () => {
  it("llegeix les coordenades i l'adreça de cada resultat, en ordre (Nominatim les dona en text)", () => {
    expect(
      parseNominatim([
        { lat: '41.4030', lon: '2.1570', display_name: 'Carrer de Verdi, 10, Gràcia, Barcelona' },
        { lat: '41.6', lon: '2.29', display_name: 'Carrer de Verdi, 10, Granollers' },
      ]),
    ).toEqual([
      { lat: 41.403, lng: 2.157, label: 'Carrer de Verdi, 10, Gràcia, Barcelona' },
      { lat: 41.6, lng: 2.29, label: 'Carrer de Verdi, 10, Granollers' },
    ]);
  });

  it('accepta coordenades numèriques i resultats sense adreça', () => {
    expect(parseNominatim([{ lat: -33.86, lon: 151.21 }])).toEqual([{ lat: -33.86, lng: 151.21, label: '' }]);
  });

  it('sense resultats, retorna una llista buida', () => {
    expect(parseNominatim([])).toEqual([]);
    expect(parseNominatim({ error: 'Unable to geocode' })).toEqual([]);
    expect(parseNominatim(null)).toEqual([]);
  });

  it('descarta els resultats que no són coordenades vàlides i manté la resta', () => {
    expect(parseNominatim([{ lat: 'nord', lon: '2.15' }])).toEqual([]);
    expect(parseNominatim([{ lat: '41.4' }])).toEqual([]);
    expect(parseNominatim([{ lat: null, lon: null }])).toEqual([]);
    expect(parseNominatim([{ lat: '', lon: '' }])).toEqual([]);
    expect(parseNominatim([{ lat: '91', lon: '2.15' }])).toEqual([]);
    expect(parseNominatim([{ lat: '41.4', lon: '-181' }])).toEqual([]);
    expect(parseNominatim([null, { lat: '41.4', lon: '2.15', display_name: 'Bo' }])).toEqual([{ lat: 41.4, lng: 2.15, label: 'Bo' }]);
  });
});
