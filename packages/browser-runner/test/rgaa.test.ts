import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { RGAA_AXE_MAP, rgaaFromAxe } from '../src/rgaa.js';
import type { AxeSummary } from '../src/schema.js';

const rules = new Map(axe.getRules().map((r) => [r.ruleId, r.tags]));

describe('correspondance RGAA ↔ axe-core', () => {
  it('déclare une couverture partielle', () => {
    expect(RGAA_AXE_MAP.coverage).toBe('partial');
    expect(RGAA_AXE_MAP.criteriaTotal).toBe(106);
    expect(RGAA_AXE_MAP.criteria.length).toBeLessThan(
      RGAA_AXE_MAP.criteriaTotal,
    );
    expect(RGAA_AXE_MAP.note).toMatch(/partielle/i);
  });

  it('cite des critères uniques, dans les 13 thématiques', () => {
    const ids = RGAA_AXE_MAP.criteria.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const theme = Number(id.split('.')[0]);
      expect(theme).toBeGreaterThanOrEqual(1);
      expect(theme).toBeLessThanOrEqual(13);
    }
  });

  it('ne cite que des règles axe existantes, ni expérimentales ni obsolètes', () => {
    expect(RGAA_AXE_MAP.axeVersion).toBe(
      axe.version.split('.').slice(0, 2).join('.'),
    );
    for (const criterion of RGAA_AXE_MAP.criteria) {
      for (const rule of criterion.rules) {
        const tags = rules.get(rule);
        expect(tags, `${criterion.id} : ${rule}`).toBeDefined();
        expect(tags).not.toContain('experimental');
        expect(tags).not.toContain('deprecated');
      }
    }
  });
});

describe('rgaaFromAxe', () => {
  const summary = (over: Partial<AxeSummary>): AxeSummary => ({
    version: axe.version,
    url: 'https://www.exemple.fr/',
    violations: [],
    incomplete: [],
    passes: [],
    inapplicable: [],
    ...over,
  });
  const rule = (id: string) => ({
    id,
    impact: 'serious' as const,
    tags: [],
    help: '',
    helpUrl: '',
    nodeCount: 1,
    nodes: [],
  });

  it('échec > à vérifier > réussi automatiquement > sans objet > non lancé', () => {
    const result = rgaaFromAxe(
      summary({
        violations: [rule('image-alt')],
        incomplete: [rule('color-contrast')],
        passes: ['document-title', 'svg-img-alt'],
        inapplicable: ['frame-title'],
      }),
    );
    const status = new Map(result.criteria.map((c) => [c.id, c]));
    expect(status.get('1.1')).toMatchObject({
      status: 'fail',
      failedRules: ['image-alt'],
    });
    expect(status.get('3.2')?.status).toBe('incomplete');
    expect(status.get('8.5')?.status).toBe('passed_auto');
    expect(status.get('2.1')?.status).toBe('inapplicable');
    expect(status.get('8.3')?.status).toBe('not_run');
    expect(result).toMatchObject({
      version: '4.1.2',
      criteriaTotal: 106,
      criteriaMapped: RGAA_AXE_MAP.criteria.length,
      coverage: 'partial',
    });
  });
});
