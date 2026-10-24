import { describe, expect, it } from 'vitest';
import { safeNext } from './nav.js';

describe('safeNext', () => {
  it('garde un chemin du site', () => {
    expect(safeNext('/lancer?url=exemple.fr')).toBe('/lancer?url=exemple.fr');
    expect(safeNext(null)).toBe('/sites');
  });

  it('refuse une adresse externe', () => {
    expect(safeNext('https://exemple.fr')).toBe('/sites');
    expect(safeNext('//exemple.fr')).toBe('/sites');
    expect(safeNext('/\\exemple.fr')).toBe('/sites');
    expect(safeNext('/ok\n')).toBe('/sites');
  });
});
