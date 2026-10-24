import { describe, expect, it } from 'vitest';
import { readRestaurantParam, restaurantUrl, withoutRestaurantParam } from './restaurantLink';

const ID = '20000000-0000-4000-8000-000000000001';

describe('restaurantLink', () => {
  it('construeix l\'enllaç a l\'arrel de l\'app', () => {
    expect(restaurantUrl(ID, 'https://onmengem.example')).toBe(`https://onmengem.example/?r=${ID}`);
  });

  it('llegeix l\'id del que genera restaurantUrl', () => {
    expect(readRestaurantParam(new URL(restaurantUrl(ID, 'https://x.dev')).search)).toBe(ID);
  });

  it('normalitza a minúscules i ignora espais', () => {
    expect(readRestaurantParam(`?r=%20${ID.toUpperCase()}%20`)).toBe(ID);
  });

  it('ignora el paràmetre si no hi és o no és un UUID', () => {
    expect(readRestaurantParam('')).toBeNull();
    expect(readRestaurantParam('?r=')).toBeNull();
    expect(readRestaurantParam('?r=abc')).toBeNull();
    expect(readRestaurantParam(`?r=${ID}' or 1=1`)).toBeNull();
  });

  it('treu només el paràmetre r de la URL', () => {
    expect(withoutRestaurantParam(`https://x.dev/?r=${ID}`)).toBe('/');
    expect(withoutRestaurantParam(`https://x.dev/?a=1&r=${ID}#top`)).toBe('/?a=1#top');
  });
});
