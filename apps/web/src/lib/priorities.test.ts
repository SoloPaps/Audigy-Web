import { describe, expect, it } from 'vitest';
import { actorOf, difficultyOf, pickPriorities, whyOf } from './priorities.js';
import type { ReportRow } from './report-model.js';

function row(partial: Partial<ReportRow> & { checkId: string }): ReportRow {
  return {
    id: partial.checkId,
    status: 'fail',
    severity: 2,
    impact: 2,
    title: partial.checkId,
    why: 'Pourquoi.',
    effort: '15 min',
    steps: [],
    catalogStatus: 'fail',
    proof: 'Preuve.',
    impactText: null,
    sources: [],
    domain: 'securite',
    minutes: 15,
    fixKey: null,
    ...partial,
  };
}

describe('trois priorités', () => {
  it('prend les actions qui paient le plus pour le moins d’effort', () => {
    const picked = pickPriorities([
      row({ checkId: 'a.long', minutes: 240, severity: 2, impact: 2 }),
      row({ checkId: 'a.court', minutes: 5, severity: 3, impact: 3 }),
      row({ checkId: 'b.moyen', minutes: 30, severity: 3, impact: 2 }),
      row({ checkId: 'c.petit', minutes: 5, severity: 1, impact: 1 }),
    ]);
    expect(picked.map((item) => item.checkId)).toEqual([
      'a.court',
      'b.moyen',
      'c.petit',
    ]);
  });

  it('mélange les domaines quand les valeurs sont proches', () => {
    const picked = pickPriorities([
      row({ checkId: 'securite.a', domain: 'securite', severity: 3 }),
      row({ checkId: 'securite.b', domain: 'securite', severity: 3 }),
      row({ checkId: 'seo.a', domain: 'seo', severity: 3 }),
    ]);
    expect(picked.map((item) => item.checkId)).toEqual([
      'securite.a',
      'seo.a',
      'securite.b',
    ]);
  });

  it('ignore les réussites et les non testés', () => {
    const picked = pickPriorities([
      row({ checkId: 'ok', status: 'pass', catalogStatus: 'pass' }),
      row({ checkId: 'nt', status: 'untested', catalogStatus: 'untested' }),
      row({ checkId: 'warn', status: 'warn', catalogStatus: 'warn' }),
    ]);
    expect(picked.map((item) => item.checkId)).toEqual(['warn']);
  });

  it('rend le même ordre à chaque appel', () => {
    const rows = [
      row({ checkId: 'x.b' }),
      row({ checkId: 'x.a' }),
      row({ checkId: 'x.c' }),
    ];
    const first = pickPriorities(rows).map((item) => item.checkId);
    expect(pickPriorities([...rows].reverse()).map((i) => i.checkId)).toEqual(
      first,
    );
  });

  it('donne difficulté, acteur et pourquoi', () => {
    expect(difficultyOf(10)).toBe('easy');
    expect(difficultyOf(45)).toBe('medium');
    expect(difficultyOf(120)).toBe('hard');
    expect(difficultyOf(null)).toBe('medium');
    expect(actorOf('dns_email')).toBe('sysadmin');
    expect(actorOf('seo')).toBe('owner');
    expect(actorOf('securite')).toBe('developer');
    expect(whyOf('securite.hsts')).toMatch(/HTTPS/);
    expect(whyOf('inconnu.test')).toMatch(/fiabilité/);
  });
});
