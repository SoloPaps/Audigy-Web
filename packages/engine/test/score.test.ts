import { describe, expect, it } from 'vitest';
import {
  type CheckOutcome,
  type CheckResult,
  type Domain,
  levelFor,
  MAIN_DOMAINS,
  prioritize,
  scoreDomain,
  scoreDomains,
  scoreGlobal,
} from '../src/index.js';
import { result } from './helpers.js';

function outcome(
  checkId: string,
  weight: 1 | 2 | 3,
  res: CheckResult,
): CheckOutcome {
  return {
    checkId,
    domain: checkId.split('.')[0] as Domain,
    mode: 'passive',
    weight,
    result: res,
  };
}

describe('scoreDomain', () => {
  it('moyenne pondérée arrondie, scores par défaut pass 1 / warn 0,5 / fail 0', () => {
    const s = scoreDomain('seo', [
      outcome('seo.a', 3, result('pass')),
      outcome('seo.b', 2, result('warn')),
      outcome('seo.c', 1, result('fail')),
    ]);
    expect(s).toEqual({
      domain: 'seo',
      score: 67,
      coverage: 1,
      testedWeight: 6,
      totalWeight: 6,
      level: 'improve',
    });
  });

  it('utilise le score explicite du résultat', () => {
    const s = scoreDomain('performance', [
      outcome('performance.lh', 3, result('warn', { score: 0.73 })),
      outcome('performance.cache', 1, result('pass')),
    ]);
    expect(s.score).toBe(80);
  });

  it('exclut untested et na du score ; na hors du poids total', () => {
    const s = scoreDomain('seo', [
      outcome('seo.a', 2, result('pass')),
      outcome('seo.b', 1, result('untested')),
      outcome('seo.c', 3, result('na')),
    ]);
    expect(s).toMatchObject({ score: 100, testedWeight: 2, totalWeight: 3 });
    expect(s.coverage).toBeCloseTo(2 / 3);
  });

  it('couverture < 50 % → domaine non noté', () => {
    const s = scoreDomain('securite', [
      outcome('securite.a', 1, result('fail')),
      outcome('securite.b', 2, result('untested')),
    ]);
    expect(s).toMatchObject({ score: null, level: 'untested' });
    expect(s.coverage).toBeCloseTo(1 / 3);
  });

  it('couverture = 50 % → domaine noté', () => {
    const s = scoreDomain('securite', [
      outcome('securite.a', 2, result('fail')),
      outcome('securite.b', 2, result('untested')),
    ]);
    expect(s).toMatchObject({ score: 0, coverage: 0.5, level: 'problem' });
  });

  it('aucun check → non noté, couverture 0', () => {
    expect(scoreDomain('ecologie', [])).toMatchObject({
      score: null,
      coverage: 0,
    });
  });
});

describe('levelFor', () => {
  it.each([
    [100, 'good'],
    [80, 'good'],
    [79, 'improve'],
    [50, 'improve'],
    [49, 'problem'],
    [0, 'problem'],
    [null, 'untested'],
  ] as const)('%s → %s', (score, level) => {
    expect(levelFor(score)).toBe(level);
  });
});

describe('scoreGlobal', () => {
  it('moyenne égale des 8 domaines principaux notés, hors réputation et disponibilité', () => {
    const domains = scoreDomains([
      outcome('seo.a', 1, result('pass')),
      outcome('securite.a', 1, result('warn')),
      outcome('qualite.a', 1, result('fail')),
      outcome('reputation.a', 1, result('fail')),
      outcome('disponibilite.a', 1, result('fail')),
      outcome('ecologie.a', 1, result('untested')),
    ]);
    expect(scoreGlobal(domains)).toEqual({
      score: 50,
      coverage: 3 / MAIN_DOMAINS.length,
      scoredDomains: ['seo', 'securite', 'qualite'],
      level: 'improve',
    });
  });

  it('aucun domaine noté → non noté', () => {
    expect(scoreGlobal(scoreDomains([]))).toMatchObject({
      score: null,
      coverage: 0,
      level: 'untested',
    });
  });
});

describe('prioritize', () => {
  it('sévérité, puis impact, puis effort croissant, puis identifiant', () => {
    const list = [
      outcome('seo.ok', 1, result('pass', { severity: 4 })),
      outcome('seo.d', 1, result('warn', { severity: 2, impact: 3 })),
      outcome('seo.c', 1, result('fail', { severity: 3, impact: 1 })),
      outcome(
        'seo.b2',
        1,
        result('fail', { severity: 4, impact: 2, fixKey: 'long' }),
      ),
      outcome(
        'seo.b1',
        1,
        result('fail', { severity: 4, impact: 2, fixKey: 'court' }),
      ),
      outcome('seo.a', 1, result('fail', { severity: 4, impact: 2 })),
      outcome('seo.z', 1, result('fail', { severity: 4, impact: 3 })),
    ];
    const effort = (key: string) => ({ court: 5, long: 60 })[key];
    expect(prioritize(list, effort).map((o) => o.checkId)).toEqual([
      'seo.z',
      'seo.b1',
      'seo.b2',
      'seo.a',
      'seo.c',
      'seo.d',
    ]);
  });
});
