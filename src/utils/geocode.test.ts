import { describe, expect, it } from 'vitest';
import { parseArea, parseNominatim } from './geocode';

const NO_AREA = { city: null, district: null };

describe('parseNominatim', () => {
  it("llegeix les coordenades, la zona i l'adreça de cada resultat, en ordre (Nominatim les dona en text)", () => {
    expect(
      parseNominatim([
        {
          lat: '41.4030',
          lon: '2.1570',
          display_name: 'Carrer de Verdi, 10, Gràcia, Barcelona',
          address: { road: 'Carrer de Verdi', quarter: 'la Vila de Gràcia', suburb: 'Gràcia', city: 'Barcelona' },
        },
        { lat: '41.6', lon: '2.29', display_name: 'Carrer de Verdi, 10, Granollers', address: { town: 'Granollers' } },
      ]),
    ).toEqual([
      { lat: 41.403, lng: 2.157, city: 'Barcelona', district: 'Gràcia', label: 'Carrer de Verdi, 10, Gràcia, Barcelona' },
      { lat: 41.6, lng: 2.29, city: 'Granollers', district: null, label: 'Carrer de Verdi, 10, Granollers' },
    ]);
  });

  it('accepta coordenades numèriques i resultats sense adreça', () => {
    expect(parseNominatim([{ lat: -33.86, lon: 151.21 }])).toEqual([{ lat: -33.86, lng: 151.21, ...NO_AREA, label: '' }]);
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
    expect(parseNominatim([null, { lat: '41.4', lon: '2.15', display_name: 'Bo' }])).toEqual([
      { lat: 41.4, lng: 2.15, ...NO_AREA, label: 'Bo' },
    ]);
  });
});

describe('parseArea', () => {
  it('a Barcelona, la zona és el districte', () => {
    expect(parseArea({ quarter: 'la Vila de Gràcia', suburb: 'Gràcia', city: 'Barcelona' })).toEqual({
      city: 'Barcelona',
      district: 'Gràcia',
    });
  });

  it('sense districte, la zona és el barri', () => {
    expect(parseArea({ neighbourhood: 'Barri Vell', city: 'Girona' })).toEqual({ city: 'Girona', district: 'Barri Vell' });
  });

  it('sense ciutat, la població és la vila, el poble o el nucli', () => {
    expect(parseArea({ town: 'Manlleu' })).toEqual({ city: 'Manlleu', district: null });
    expect(parseArea({ village: 'Sant Joan de Palamós' })).toEqual({ city: 'Sant Joan de Palamós', district: null });
    expect(parseArea({ hamlet: 'Peratallada' })).toEqual({ city: 'Peratallada', district: null });
  });

  it('retalla els noms llargs i ignora els buits o els que no són text', () => {
    expect(parseArea({ city: 'x'.repeat(100) }).city).toHaveLength(80);
    expect(parseArea({ city: '  ', town: 'Vic', suburb: 3 })).toEqual({ city: 'Vic', district: null });
    expect(parseArea(null)).toEqual(NO_AREA);
  });
});
