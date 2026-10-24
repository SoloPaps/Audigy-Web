import { describe, expect, it } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import {
  categoryItems,
  type FixView,
  reportFindings,
  scoredDomainCount,
} from './report-model.js';

const payload: AuditPayload = {
  audit: {
    id: '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10',
    status: 'done',
    mode: 'passive',
    trigger: 'manual',
    methodVersion: '2026.1',
    engineVersion: '0.15.0',
    globalScore: 72,
    coverage: 0.5,
    createdAt: '2026-10-23T12:00:00.000Z',
    startedAt: '2026-10-23T12:00:01.000Z',
    finishedAt: '2026-10-23T12:30:00.000Z',
    error: null,
    site: {
      id: '7a2b3c4d-5e6f-4789-a012-bcdef0123456',
      url: 'https://exemple.fr',
      label: 'exemple.fr',
      scope: 'origin',
      hosting: 'other',
    },
  },
  domains: [
    { domain: 'securite', score: 40, coverage: 1, level: 'problem' },
    { domain: 'seo', score: 90, coverage: 1, level: 'good' },
  ],
  findings: [
    {
      domain: 'securite',
      checkId: 'securite.https',
      status: 'fail',
      severity: 4,
      impact: 3,
      score: 0,
      measured: {},
      messageKey: 'securite.https.fail',
      params: {},
      fixKey: 'securite.https',
      effortMinutes: 15,
      reason: null,
    },
    {
      domain: 'vie_privee',
      checkId: 'vie_privee.traceurs',
      status: 'untested',
      severity: 1,
      impact: 1,
      score: null,
      measured: {},
      messageKey: 'finding.untested',
      params: {},
      fixKey: null,
      effortMinutes: null,
      reason: 'reason.runner_absent',
    },
    {
      domain: 'seo',
      checkId: 'seo.hors',
      status: 'na',
      severity: 1,
      impact: 1,
      score: null,
      measured: {},
      messageKey: 'status.na',
      params: {},
      fixKey: null,
      effortMinutes: null,
      reason: null,
    },
  ],
};

const fix: FixView = {
  title: 'Forcer l’adresse chiffrée',
  why: 'Sans chiffrement, le réseau peut lire les échanges.',
  effortMinutes: 15,
  steps: ['Activez le certificat.'],
  code: 'Strict-Transport-Security: max-age=1',
  sourceLabel: 'MDN',
  sourceHref: 'https://developer.mozilla.org/fr/',
};

describe('rapport', () => {
  it('affiche les 8 domaines et les phrases du niveau', () => {
    const items = categoryItems(payload.domains, payload.audit.id);
    expect(items).toHaveLength(8);
    expect(items[0]?.id).toBe('performance');
    expect(items.find((item) => item.id === 'securite')).toMatchObject({
      label: 'Protection',
      score: 40,
      detail: 'Des protections importantes manquent.',
    });
    expect(items.find((item) => item.id === 'seo')?.detail).toBe(
      'Vos pages sont faciles à trouver.',
    );
    expect(scoredDomainCount(items)).toBe(2);
    expect(items[0]?.href).toContain('domaine=performance');
  });

  it('relie la fiche, écarte le non applicable et filtre un domaine', () => {
    const fixes = new Map([['securite.https', fix]]);
    const all = reportFindings(payload, fixes);
    expect(all.map((item) => item.id)).toEqual([
      'securite.https-0',
      'vie_privee.traceurs-1',
    ]);
    expect(all[0]).toMatchObject({
      title: 'Forcer l’adresse chiffrée',
      status: 'fail',
      effort: '15 min',
      code: 'Strict-Transport-Security: max-age=1',
    });
    expect(all[1]?.why).toBe(
      'Nous n’avons pas pu tester : le navigateur d’audit n’a pas tourné.',
    );
    expect(reportFindings(payload, fixes, 'securite')).toHaveLength(1);
  });
});
