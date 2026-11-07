import { describe, expect, it } from 'vitest';
import { createResponseOrder } from './responseOrder';

describe('createResponseOrder', () => {
  it('aplica les respostes que arriben en ordre', () => {
    const start = createResponseOrder();
    const first = start();
    const second = start();
    expect(first()).toBe(true);
    expect(second()).toBe(true);
  });

  it('descarta una resposta vella que arriba després d’una de més nova', () => {
    const start = createResponseOrder();
    const older = start();
    const newer = start();
    expect(newer()).toBe(true);
    expect(older()).toBe(false);
  });

  it('aplica una resposta encara que hi hagi una petició més nova en curs', () => {
    const start = createResponseOrder();
    const older = start();
    start();
    expect(older()).toBe(true);
  });

  it('no perd la resposta vella si la nova falla', () => {
    const start = createResponseOrder();
    const older = start();
    start(); // falla: mai es crida la seva funció
    expect(older()).toBe(true);
  });

  it('continua funcionant després de descartar-ne una', () => {
    const start = createResponseOrder();
    const older = start();
    const newer = start();
    newer();
    older();
    expect(start()()).toBe(true);
  });

  it('porta cada lectura pel seu compte', () => {
    const startRestaurants = createResponseOrder();
    const startWishlist = createResponseOrder();
    const wishlist = startWishlist();
    startRestaurants()();
    expect(wishlist()).toBe(true);
  });
});
