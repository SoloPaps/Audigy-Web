import { describe, expect, it } from 'vitest';
import { createRegistry } from '../src/index.js';
import { facticeActif, facticePassif } from './factices.js';
import { fakeCheck, result } from './helpers.js';

describe('createRegistry', () => {
  it('liste les checks triés et filtre par domaine et mode', () => {
    const registry = createRegistry([facticePassif, facticeActif]);
    registry.register(fakeCheck('qualite.aaa', result('pass')));
    expect(registry.size).toBe(3);
    expect(registry.list().map((c) => c.id)).toEqual([
      'qualite.aaa',
      'qualite.factice_passif',
      'securite.factice_actif',
    ]);
    expect(registry.list({ domain: 'securite' })).toEqual([facticeActif]);
    expect(registry.list({ mode: 'active' })).toEqual([facticeActif]);
    expect(registry.get('qualite.factice_passif')).toBe(facticePassif);
  });

  it('refuse un doublon', () => {
    const registry = createRegistry([facticePassif]);
    expect(() => registry.register(facticePassif)).toThrow(/déjà/);
  });

  it.each([
    ['id sans domaine', fakeCheck('hsts', result('pass'), { domain: 'seo' })],
    [
      'préfixe ≠ domaine',
      fakeCheck('seo.x', result('pass'), { domain: 'qualite' }),
    ],
    ['domaine inconnu', fakeCheck('autre.x', result('pass'))],
    ['mode', fakeCheck('seo.x', result('pass'), { mode: 'x' as never })],
    ['poids', fakeCheck('seo.x', result('pass'), { weight: 4 as never })],
    [
      'besoin inconnu',
      fakeCheck('seo.x', result('pass'), { needs: ['ftp' as never] }),
    ],
    [
      'besoin en double',
      fakeCheck('seo.x', result('pass'), { needs: ['http', 'http'] }),
    ],
    ['délai', fakeCheck('seo.x', result('pass'), { timeoutMs: 0 })],
  ])('refuse un check invalide (%s)', (_label, check) => {
    expect(() => createRegistry([check])).toThrow();
  });
});
