import { describe, expect, it } from 'vitest';
import { REPORT_DOMAINS } from './domains.js';
import {
  HOME_EXAMPLE_ROWS,
  HOME_EXAMPLE_SCORE,
  HOME_OFFER_SCORES,
} from './home-example.js';
import { levelForScore } from './score.js';

describe('exemple d’accueil', () => {
  it('fixe la jauge à 72 et deux lignes de formes différentes', () => {
    expect(HOME_EXAMPLE_SCORE).toBe(72);
    expect(levelForScore(HOME_EXAMPLE_SCORE)).toBe('improve');
    expect(HOME_EXAMPLE_ROWS).toEqual([
      { key: 'domain.seo.plain', score: 64 },
      { key: 'home.example.https', score: 86 },
    ]);
    expect(levelForScore(64)).toBe('improve');
    expect(levelForScore(86)).toBe('good');
    expect(Object.keys(HOME_OFFER_SCORES)).toEqual([...REPORT_DOMAINS]);
  });
});
