import { describe, expect, it } from 'vitest';
import type { AuditPayload } from './audit-api.js';
import {
  categoryItems,
  type FixView,
  reportFindings,
  reportRows,
  reputationAside,
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
    expect(items[0]?.causes).toBeUndefined();
  });

  it('explique un domaine sans note sur le rapport du propriétaire', () => {
    const items = categoryItems(
      [
        ...payload.domains,
        { domain: 'vie_privee', score: null, coverage: 0.2, level: 'untested' },
      ],
      payload.audit.id,
      payload.findings,
    );
    const row = items.find((item) => item.id === 'vie_privee');
    expect(row?.detail).toBe('Nous n’avons pas pu vérifier la vie privée.');
    expect(row?.coverageNote).toBe(
      'Moins de la moitié des tests ont abouti. Ce domaine n’a pas de note.',
    );
    expect(row?.causes?.primary?.text).toBe(
      'Le navigateur d’audit n’a pas tourné.',
    );
    expect(row?.causes?.closing).toBe('Ce n’est pas une note du site.');
    expect(JSON.stringify(row)).not.toMatch(/reason\.|clé/);
  });

  it('relie la fiche, écarte le non applicable et filtre un domaine', () => {
    const fixes = new Map([['securite.https', fix]]);
    const all = reportFindings(payload, fixes);
    expect(all.map((item) => item.id)).toEqual([
      'securite.https',
      'vie_privee.traceurs',
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
    expect(all[1]?.title).toBe('Traceurs avant votre choix : non testé');
    expect(all[1]?.limit ?? null).toBeNull();
    expect(reportFindings(payload, fixes, 'securite')).toHaveLength(1);
  });

  it('garde le même identifiant quand la liste change', () => {
    const fixes = new Map<string, FixView>();
    const partial = reportRows(payload, fixes).map((row) => row.id);
    const reversed = reportRows(
      { ...payload, findings: [...payload.findings].reverse() },
      fixes,
    ).map((row) => row.id);
    expect([...reversed].sort()).toEqual([...partial].sort());
    const first = payload.findings[0];
    if (!first) throw new Error('fixture');
    const twice = reportRows(
      { ...payload, findings: [first, first] },
      fixes,
    ).map((row) => row.id);
    expect(twice).toEqual([first.checkId, `${first.checkId}-1`]);
  });

  it('range la limite à part et garde la cause hors du constat', () => {
    const hosted = {
      domain: 'ecologie',
      checkId: 'ecologie.hebergeur',
      status: 'warn',
      severity: 2,
      impact: 1,
      score: 60,
      measured: {},
      messageKey: 'ecologie.hebergeur.pass_anonyme',
      params: {},
      fixKey: null,
      effortMinutes: 10,
      reason: null,
    };
    const [plain] = reportFindings(
      { ...payload, findings: [hosted] },
      new Map(),
    );
    expect(plain?.title).toBe(
      'L’annuaire indique un hébergeur à électricité renouvelable.',
    );
    expect(plain?.why).toBe(plain?.title);
    expect(plain?.limit).toBe(
      'Cela ne couvre pas toute la chaîne d’hébergement.',
    );
    const hostedRows = reportRows(
      { ...payload, findings: [hosted] },
      new Map(),
    );
    expect(hostedRows[0]?.impactText).toBe(plain?.limit);
    expect(hostedRows[0]?.proof).toBe(plain?.why);
    const withFix = reportFindings(
      {
        ...payload,
        findings: [
          {
            ...hosted,
            fixKey: 'ecologie.hebergeur',
            reason: 'reason.missing_source',
            params: { source: 'psi' },
          },
        ],
      },
      new Map([
        [
          'ecologie.hebergeur',
          {
            title: 'Choisir l’hébergeur',
            why: 'L’électricité du serveur compte dans la page.',
            effortMinutes: 10,
            steps: ['Regardez l’annuaire.'],
          },
        ],
      ]),
    );
    expect(withFix[0]?.why).toBe(
      'L’électricité du serveur compte dans la page.',
    );
    expect(withFix[0]?.limit).toContain('PageSpeed');
    expect(withFix[0]?.limit).not.toContain('psi');
    expect(JSON.stringify(withFix[0])).not.toMatch(/clé/u);
  });

  it('garde le non applicable pour le brief, hors du score affiché', () => {
    const fixes = new Map([['securite.https', fix]]);
    const rows = reportRows(payload, fixes);
    expect(rows.map((item) => item.checkId)).toEqual([
      'securite.https',
      'vie_privee.traceurs',
      'seo.hors',
    ]);
    expect(rows.map((item) => item.catalogStatus)).toEqual([
      'fail',
      'untested',
      'na',
    ]);
    expect(rows[0]?.sources).toEqual([
      { label: 'MDN', url: 'https://developer.mozilla.org/fr/' },
    ]);
    expect(rows[0]?.proof).toBe(rows[0]?.why);
    expect(rows[0]?.impactText).toBeNull();
    expect(rows[2]?.status).toBe('untested');
    expect(
      reportFindings(payload, fixes).some((item) =>
        item.id.includes('seo.hors'),
      ),
    ).toBe(false);
  });

  it('sans OAuth, le constat propose le lien Search Console', () => {
    const row = {
      domain: 'seo',
      checkId: 'seo.gsc_inspection',
      status: 'untested',
      severity: 1,
      impact: 1,
      score: null,
      measured: { connected: false },
      messageKey: 'seo.gsc.untested_connect',
      params: {},
      fixKey: null,
      effortMinutes: null,
      reason: 'seo.gsc.untested_connect',
    };
    const [finding] = reportFindings(
      { ...payload, findings: [row] },
      new Map(),
    );
    expect(finding?.status).toBe('untested');
    expect(finding?.actionLabel).toBe('Connecter Search Console');
    expect(finding?.actionHref).toBe('/search-console');
    expect(JSON.stringify(finding)).not.toContain('refresh');
  });

  it('affiche les avis à part et les masque s’ils sont absents', () => {
    expect(reputationAside(payload)).toBeNull();
    const withAvis = {
      ...payload,
      domains: [
        ...payload.domains,
        { domain: 'reputation', score: 92, coverage: 1, level: 'good' },
      ],
      findings: [
        ...payload.findings,
        {
          domain: 'reputation',
          checkId: 'reputation.avis',
          status: 'pass',
          severity: 1,
          impact: 2,
          score: 0.92,
          measured: {
            rating: 4.6,
            reviewCount: 12,
            placeName: 'Cabinet des Tilleuls',
          },
          messageKey: 'reputation.avis.pass',
          params: {},
          fixKey: null,
          effortMinutes: null,
          reason: null,
        },
      ],
    };
    expect(categoryItems(withAvis.domains, withAvis.audit.id)).toHaveLength(8);
    expect(reputationAside(withAvis)).toMatchObject({
      score: 92,
      rating: 4.6,
      reviewCount: 12,
      name: 'Cabinet des Tilleuls',
    });
    expect(
      reportFindings(withAvis, new Map()).map((item) => item.id),
    ).not.toContain('reputation.avis-3');
  });
});
