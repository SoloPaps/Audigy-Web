import { describe, expect, it } from 'vitest';
import { progressionHref, relaunchHref } from './relaunch.js';

describe('relance', () => {
  it('la progression porte l’id reçu, pas un rapport', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const href = progressionHref(id);
    expect(href).toBe(`/progression?id=${id}`);
    expect(href).not.toContain('/rapport');
  });

  it('relancer ouvre le formulaire du site', () => {
    expect(relaunchHref('site-1')).toBe('/lancer?site=site-1');
  });
});
