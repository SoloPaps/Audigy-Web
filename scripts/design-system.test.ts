import { describe, expect, it } from 'vitest';
import { demoCategories, demoGlobalScore } from '../apps/web/src/data/demo.js';
import {
  type Finding,
  filterFindings,
  sortFindings,
} from '../apps/web/src/lib/findings.js';
import { formatReportStamp } from '../apps/web/src/lib/format-report-stamp.js';
import { gaugeArc, levelForScore } from '../apps/web/src/lib/score.js';

describe('niveaux de score', () => {
  it('classe les seuils 80, 50 et l’absence de score', () => {
    expect(levelForScore(100)).toBe('good');
    expect(levelForScore(80)).toBe('good');
    expect(levelForScore(79)).toBe('improve');
    expect(levelForScore(50)).toBe('improve');
    expect(levelForScore(49)).toBe('problem');
    expect(levelForScore(0)).toBe('problem');
    expect(levelForScore(null)).toBe('untested');
  });
});

describe('jauge', () => {
  it('trace un arc de 270° ouvert', () => {
    const arc = gaugeArc(80, 68, 54);
    expect(arc.startsWith('M ')).toBe(true);
    expect(arc).toContain('A 54 54 0 1 1');
    expect(arc.includes('Z')).toBe(false);
  });
});

describe('score global d’exemple', () => {
  it('moyenne les domaines notés et ignore le non testé', () => {
    expect(demoGlobalScore()).toBe(72);
    expect(demoCategories().some((item) => item.score === null)).toBe(true);
  });
});

describe('pied de rapport', () => {
  it('formate la date à Paris', () => {
    expect(formatReportStamp(new Date('2026-10-23T12:30:00Z'))).toBe(
      '23 oct. 2026, 14:30',
    );
  });
});

describe('liste des corrections', () => {
  const findings: Finding[] = [
    {
      id: 'b',
      status: 'warn',
      severity: 2,
      impact: 1,
      title: 'Images',
      why: 'Trop lourdes.',
      effort: '10 min',
      steps: ['Compresser.'],
    },
    {
      id: 'a',
      status: 'fail',
      severity: 4,
      impact: 2,
      title: 'Https',
      why: 'Page lisible.',
      effort: '20 min',
      steps: ['Rediriger.'],
    },
    {
      id: 'c',
      status: 'pass',
      severity: 1,
      impact: 1,
      title: 'Titre',
      why: 'Clair.',
      effort: 'Rien à changer',
      steps: ['Garder.'],
    },
  ];

  it('trie par sévérité puis par impact', () => {
    expect(sortFindings(findings).map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('filtre les réussites', () => {
    expect(filterFindings(findings, 'pass').map((item) => item.id)).toEqual([
      'c',
    ]);
  });
});
