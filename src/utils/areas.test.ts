import { describe, expect, it } from 'vitest';
import { ALL_AREAS, areaLabel, cityAreas, cityFilter, districtFilter, matchesArea, validAreaFilter } from './areas';

const gracia = { city: 'Barcelona', district: 'Gràcia' };
const eixample = { city: 'Barcelona', district: 'Eixample' };
const vic = { city: 'Vic' };
const unknown = {};

describe('areaLabel', () => {
  it('posa la zona davant de la població', () => {
    expect(areaLabel(gracia)).toBe('Gràcia · Barcelona');
    expect(areaLabel(vic)).toBe('Vic');
    expect(areaLabel(unknown)).toBeNull();
  });
});

describe('cityAreas', () => {
  it('agrupa les zones per població, en ordre alfabètic i sense repetir-les', () => {
    expect(cityAreas([vic, gracia, eixample, gracia, unknown, { city: 'Àger' }])).toEqual([
      { city: 'Àger', districts: [] },
      { city: 'Barcelona', districts: ['Eixample', 'Gràcia'] },
      { city: 'Vic', districts: [] },
    ]);
  });
});

describe('validAreaFilter', () => {
  const areas = cityAreas([gracia, vic]);

  it('manté els filtres que corresponen a alguna zona de la llista', () => {
    expect(validAreaFilter(cityFilter('Barcelona'), areas)).toBe(cityFilter('Barcelona'));
    expect(validAreaFilter(districtFilter('Barcelona', 'Gràcia'), areas)).toBe(districtFilter('Barcelona', 'Gràcia'));
  });

  it("torna a «totes» si la zona no hi és (p. ex. és d'un altre espai)", () => {
    expect(validAreaFilter(cityFilter('Girona'), areas)).toBe(ALL_AREAS);
    expect(validAreaFilter(districtFilter('Barcelona', 'Eixample'), areas)).toBe(ALL_AREAS);
  });
});

describe('matchesArea', () => {
  it('filtra per població o per zona', () => {
    expect(matchesArea(gracia, cityFilter('Barcelona'))).toBe(true);
    expect(matchesArea(gracia, districtFilter('Barcelona', 'Gràcia'))).toBe(true);
    expect(matchesArea(eixample, districtFilter('Barcelona', 'Gràcia'))).toBe(false);
    expect(matchesArea(vic, cityFilter('Barcelona'))).toBe(false);
  });

  it('els llocs sense població només passen sense filtre', () => {
    expect(matchesArea(unknown, ALL_AREAS)).toBe(true);
    expect(matchesArea(unknown, cityFilter('Barcelona'))).toBe(false);
  });
});
