import { describe, expect, it } from 'vitest';
import {
  demoCategories,
  demoFindings,
  demoGlobalScore,
} from '../apps/web/src/data/demo.js';
import {
  type Finding,
  filterFindings,
  groupFindings,
  sortFindings,
  topActions,
} from '../apps/web/src/lib/findings.js';
import { formatReportStamp } from '../apps/web/src/lib/format-report-stamp.js';
import { GAUGE, gaugeArc, levelForScore } from '../apps/web/src/lib/score.js';
import { verdictCopy } from '../apps/web/src/lib/verdict.js';

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
    const arc = gaugeArc(GAUGE.cx, GAUGE.cy, GAUGE.r);
    expect(arc.startsWith('M ')).toBe(true);
    expect(arc).toContain(`A ${GAUGE.r} ${GAUGE.r} 0 1 1`);
    expect(arc.includes('Z')).toBe(false);
    expect(GAUGE.r).toBeGreaterThan(60);
  });
});

describe('score global d’exemple', () => {
  it('moyenne les domaines notés et ignore le non testé', () => {
    expect(demoGlobalScore()).toBe(83);
    expect(demoCategories().some((item) => item.score === null)).toBe(true);
    const seo = demoCategories().find((item) => item.id === 'seo');
    expect(seo?.label).toBe('Visibilité sur Google');
    expect(seo?.technical).toBe('Référencement');
  });
});

describe('verdict d’exemple', () => {
  it('reste honnête avec le score et les constats', () => {
    const verdict = verdictCopy(demoGlobalScore(), demoFindings());
    expect(verdict.level).toBe('good');
    expect(verdict.headline).toBe('Votre site est en bonne santé.');
    expect(verdict.detail).toBe(
      '4 points à corriger, dont 1 urgent. 1 point n’a pas pu être testé.',
    );
    expect(topActions(demoFindings()).map((item) => item.id)).toEqual([
      'https',
      'frame',
      'images',
    ]);
    const groups = groupFindings(demoFindings());
    expect(groups.priority.map((item) => item.id)).toEqual(['https']);
    expect(groups.good.map((item) => item.id)).toEqual(['lang', 'title']);
  });

  it('accorde le pluriel', () => {
    expect(
      verdictCopy(40, [{ status: 'fail' }, { status: 'fail' }]).detail,
    ).toBe('2 points à corriger, dont 2 urgents.');
    expect(verdictCopy(90, [{ status: 'pass' }]).detail).toBe(
      'Rien à corriger pour l’instant.',
    );
    expect(verdictCopy(null, []).headline).toBe(
      'Nous n’avons pas assez de mesures.',
    );
  });
});

describe('pied de rapport', () => {
  it('formate la date à Paris', () => {
    expect(formatReportStamp(new Date('2026-10-23T12:30:00Z'))).toBe(
      '23 oct. 2026, 14 h 30',
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
