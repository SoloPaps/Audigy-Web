import { describe, expect, it } from 'vitest';
import {
  type AuditSnapshot,
  axisDay,
  axisLabels,
  clampSeries,
  compareAudits,
  historyDay,
  historySummary,
  historyTable,
  MAX_SERIES,
  rowsToHistory,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_THRESHOLDS,
  seriesStyle,
  yRange,
} from './history.js';

const march = '2026-03-03T08:00:00.000Z';
const june = '2026-06-02T08:00:00.000Z';
const october = '2026-10-23T12:30:00.000Z';

describe('axe des scores', () => {
  it('reste sur 0 et 100 même si les notes sont serrées', () => {
    expect(yRange(70, 90)).toEqual([SCORE_MIN, SCORE_MAX]);
    expect(yRange(0, 0)).toEqual([0, 100]);
    expect(SCORE_THRESHOLDS).toEqual([50, 80]);
  });

  it('limite à trois traits différents', () => {
    expect(clampSeries(['a', 'b', 'a', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(clampSeries(['a', 'b', 'c', 'd'])).toHaveLength(MAX_SERIES);
    expect(seriesStyle(0).stroke).toBe('solid');
    expect(seriesStyle(1).stroke).toBe('dashed');
    expect(seriesStyle(2).stroke).toBe('dotted');
    expect(seriesStyle(0).dash).toEqual([]);
    expect(seriesStyle(1).dash.length).toBeGreaterThan(0);
    expect(seriesStyle(2).dash).not.toEqual(seriesStyle(1).dash);
  });
});

describe('résumé', () => {
  const points = [
    { id: 'a', at: march, href: '#a', scores: { global: 71 } },
    { id: 'b', at: june, href: '#b', scores: { global: null } },
    { id: 'c', at: october, href: '#c', scores: { global: 83 } },
  ];

  it('dit le gain depuis le premier jour', () => {
    expect(historyDay(march)).toBe('3 mars');
    expect(historyDay('2026-03-02T23:30:00.000Z')).toBe('3 mars');
    expect(historySummary(points, 'global')).toBe(
      '+12 points depuis le 3 mars',
    );
  });

  it('accorde le singulier, la baisse et l’égalité', () => {
    expect(
      historySummary(
        [
          { id: 'a', at: march, href: '#a', scores: { global: 70 } },
          { id: 'b', at: october, href: '#b', scores: { global: 71 } },
        ],
        'global',
      ),
    ).toBe('+1 point depuis le 3 mars');
    expect(
      historySummary(
        [
          { id: 'a', at: march, href: '#a', scores: { global: 80 } },
          { id: 'b', at: october, href: '#b', scores: { global: 68 } },
        ],
        'global',
      ),
    ).toBe('−12 points depuis le 3 mars');
    expect(
      historySummary(
        [
          { id: 'a', at: march, href: '#a', scores: { global: 80 } },
          { id: 'b', at: october, href: '#b', scores: { global: 79 } },
        ],
        'global',
      ),
    ).toBe('−1 point depuis le 3 mars');
    expect(
      historySummary(
        [
          { id: 'a', at: march, href: '#a', scores: { global: 80 } },
          { id: 'b', at: october, href: '#b', scores: { global: 80 } },
        ],
        'global',
      ),
    ).toBe('Même score depuis le 3 mars');
  });

  it('ne invente pas un écart sans seconde mesure', () => {
    expect(
      historySummary(
        [{ id: 'a', at: march, href: '#a', scores: { global: 71 } }],
        'global',
      ),
    ).toBe('Première mesure le 3 mars');
    expect(historySummary([], 'global')).toBe('Pas encore de mesure.');
  });
});

describe('tableau', () => {
  it('reproduit les notes et le niveau', () => {
    const table = historyTable(
      [
        { id: 'a', at: march, href: '#a', scores: { global: 71 } },
        { id: 'c', at: october, href: '#c', scores: { global: 83 } },
      ],
      [{ id: 'global', label: 'Score global' }],
    );
    expect(table.caption).toBe('Scores du 3 mars 2026 au 23 oct. 2026');
    expect(table.columns.map((column) => column.label)).toEqual([
      'Date',
      'Score global',
    ]);
    expect(table.rows[0]?.[1]).toMatchObject({
      text: '71',
      level: 'improve',
      numeric: true,
    });
    expect(table.rows[1]?.[1]).toMatchObject({ text: '83', level: 'good' });
    expect(axisDay(Date.parse(october) / 1000)).toBe('23 oct.');
  });
});

describe('libellés d’axe', () => {
  const at = (iso: string) => Date.parse(iso) / 1000;

  it('garde le jour quand les points changent de jour de Paris', () => {
    expect(
      axisLabels([
        at('2026-03-03T08:00:00.000Z'),
        at('2026-10-23T12:30:00.000Z'),
      ]),
    ).toEqual(['3 mars', '23 oct.']);
  });

  it('passe en heures quand tous les points sont le même jour de Paris', () => {
    expect(
      axisLabels([
        at('2026-10-23T22:30:00.000Z'),
        at('2026-10-24T12:32:00.000Z'),
      ]),
    ).toEqual(['0 h 30', '14 h 32']);
  });

  it('affiche les heures piles demandées par la spec', () => {
    expect(
      axisLabels([
        at('2026-10-23T07:00:00.000Z'),
        at('2026-10-23T12:00:00.000Z'),
        at('2026-10-23T16:00:00.000Z'),
      ]),
    ).toEqual(['9 h', '14 h', '18 h']);
  });

  it('affiche l’heure d’un point isolé, pas la date', () => {
    expect(axisLabels([at('2026-10-23T12:00:00.000Z')])).toEqual(['14 h']);
  });

  it('reste en dates courtes dès que deux jours de Paris sont visibles', () => {
    expect(
      axisLabels([
        at('2026-10-22T10:00:00.000Z'),
        at('2026-10-23T22:30:00.000Z'),
        at('2026-10-24T12:32:00.000Z'),
      ]),
    ).toEqual(['22 oct.', '24 oct.', '24 oct.']);
  });

  it('sépare minuit à Paris même si l’instant UTC est le même jour', () => {
    expect(
      axisLabels([
        at('2026-10-23T21:30:00.000Z'),
        at('2026-10-23T22:30:00.000Z'),
      ]),
    ).toEqual(['23 oct.', '24 oct.']);
  });

  it('distingue un jour de Paris traversé par le changement d’heure', () => {
    expect(
      axisLabels([
        at('2026-03-28T23:30:00.000Z'),
        at('2026-03-29T12:00:00.000Z'),
      ]),
    ).toEqual(['0 h 30', '14 h']);
  });
});

describe('comparaison', () => {
  const older: AuditSnapshot = {
    id: 'a',
    at: march,
    label: '3 mars 2026',
    findings: [
      { id: 'https', title: 'Chiffrement', status: 'fail', href: '#https' },
      { id: 'frame', title: 'Cadre', status: 'warn', href: '#frame' },
      { id: 'title', title: 'Titre', status: 'pass', href: '#title' },
    ],
  };
  const newer: AuditSnapshot = {
    id: 'c',
    at: october,
    label: '23 oct. 2026',
    findings: [
      { id: 'https', title: 'Chiffrement', status: 'fail', href: '#https' },
      { id: 'frame', title: 'Cadre', status: 'pass', href: '#frame' },
      { id: 'images', title: 'Images', status: 'warn', href: '#images' },
      { id: 'cookies', title: 'Cookies', status: 'untested', href: '#cookies' },
    ],
  };

  it('sépare les problèmes nouveaux et les points corrigés', () => {
    const diff = compareAudits(older, newer);
    expect(diff.added.map((item) => item.id)).toEqual(['images']);
    expect(diff.fixed.map((item) => item.id)).toEqual(['frame']);
  });

  it('ne compte ni un échec inchangé ni un test manquant comme corrigé', () => {
    const diff = compareAudits(older, {
      ...newer,
      findings: [
        { id: 'https', title: 'Chiffrement', status: 'fail', href: '#https' },
        { id: 'frame', title: 'Cadre', status: 'untested', href: '#frame' },
      ],
    });
    expect(diff.added).toEqual([]);
    expect(diff.fixed).toEqual([]);
  });
});

describe('lignes stockées', () => {
  it('ignore la file et relie les constats', () => {
    const built = rowsToHistory({
      audits: [
        {
          id: 'a',
          status: 'done',
          created_at: march,
          finished_at: march,
          global_score: 71,
        },
        {
          id: 'b',
          status: 'queued',
          created_at: june,
          finished_at: null,
          global_score: null,
        },
        {
          id: 'c',
          status: 'done',
          created_at: october,
          finished_at: october,
          global_score: 83,
        },
      ],
      domains: [
        { audit_id: 'a', domain: 'performance', score: 64 },
        { audit_id: 'c', domain: 'performance', score: 86 },
        { audit_id: 'a', domain: 'seo', score: null },
      ],
      findings: [
        {
          audit_id: 'a',
          check_id: 'https',
          status: 'fail',
          title: 'Chiffrement',
        },
        { audit_id: 'a', check_id: 'https', status: 'warn', title: 'Doublon' },
        { audit_id: 'a', check_id: 'frame', status: 'warn', title: 'Cadre' },
        {
          audit_id: 'c',
          check_id: 'https',
          status: 'fail',
          title: 'Chiffrement',
        },
        { audit_id: 'c', check_id: 'frame', status: 'pass', title: 'Cadre' },
        { audit_id: 'c', check_id: 'images', status: 'warn', title: 'Images' },
      ],
    });
    expect(built.points.map((point) => point.id)).toEqual(['a', 'c']);
    expect(built.points[1]?.href).toBe('/rapport?id=c');
    expect(built.points[0]?.scores.performance).toBe(64);
    expect(built.points[1]?.scores.performance).toBe(86);
    expect(built.series.map((item) => item.id)).toEqual([
      'global',
      'performance',
    ]);
    const older = built.snapshots[0];
    const newer = built.snapshots[1];
    if (!older || !newer) throw new Error('snapshots');
    expect(older.findings.find((item) => item.id === 'https')?.status).toBe(
      'fail',
    );
    expect(compareAudits(older, newer).fixed.map((item) => item.id)).toEqual([
      'frame',
    ]);
    expect(compareAudits(older, newer).added.map((item) => item.id)).toEqual([
      'images',
    ]);
  });
});
