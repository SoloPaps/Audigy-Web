import { describe, expect, it } from 'vitest';
import {
  causeOfFinding,
  explainUntested,
  publicCoverageNote,
} from './untested-cause.js';

function row(
  reason: string | null,
  params: Record<string, string | number> = {},
  messageKey = 'finding.untested',
) {
  return { status: 'untested', reason, messageKey, params };
}

describe('causeOfFinding', () => {
  it('traduit les sources sans jamais montrer le code', () => {
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'psi' },
      })?.text,
    ).toBe('PageSpeed n’a pas renvoyé de mesure.');
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'crux' },
      })?.text,
    ).toBe('Il n’y a pas de mesure de visite réelle.');
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'gsc' },
      }),
    ).toEqual({
      text: 'Search Console n’est pas reliée.',
      searchConsole: true,
    });
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'dns' },
      })?.text,
    ).toBe('Le DNS public n’a pas répondu.');
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'inconnu' },
      })?.text,
    ).toBe('Une source extérieure n’a pas répondu.');
    expect(
      JSON.stringify(
        causeOfFinding({
          reason: 'reason.missing_source',
          params: { source: 'psi' },
        }),
      ),
    ).not.toMatch(/psi|clé|quota|secret/);
  });

  it('regroupe le navigateur d’audit', () => {
    expect(causeOfFinding(row('reason.runner_absent'))?.text).toBe(
      'Le navigateur d’audit n’a pas tourné.',
    );
    expect(causeOfFinding(row('reason.browser_skipped'))?.text).toBe(
      'Le navigateur d’audit n’a pas tourné.',
    );
    expect(
      causeOfFinding({
        reason: 'reason.missing_source',
        params: { source: 'browser' },
      })?.text,
    ).toBe('Le navigateur d’audit n’a pas tourné.');
    expect(causeOfFinding(row('reason.runner_pending'))?.text).toBe(
      'Le navigateur d’audit n’a pas encore fini.',
    );
  });

  it('garde la phrase déjà rédigée, ou rien si la raison manque', () => {
    expect(causeOfFinding(row('reason.timeout', { seconds: 20 }))?.text).toBe(
      'Non testé : le test a dépassé 20 s.',
    );
    expect(causeOfFinding(row('reason.error'))?.text).toContain('erreur');
    expect(causeOfFinding(row(null))).toBeNull();
    expect(causeOfFinding(row('seo.gsc.untested_quota'))).toBeNull();
  });
});

describe('explainUntested', () => {
  it('choisit la cause la plus fréquente et range les autres sans doublon', () => {
    const view = explainUntested({
      coverage: 0.25,
      findings: [
        row('reason.runner_absent'),
        row('reason.browser_skipped'),
        row('reason.missing_source', { source: 'psi' }),
        row('reason.runner_absent'),
        { status: 'pass', reason: null, messageKey: 'x', params: {} },
        { status: 'na', reason: 'reason.error', messageKey: 'x', params: {} },
      ],
    });
    expect(view.coverageNote).toBe(
      'Moins de la moitié des tests ont abouti. Ce domaine n’a pas de note.',
    );
    expect(view.causes.primary).toEqual({
      text: 'Le navigateur d’audit n’a pas tourné.',
      searchConsole: false,
    });
    expect(view.causes.others).toEqual([
      { text: 'PageSpeed n’a pas renvoyé de mesure.', searchConsole: false },
    ]);
    expect(view.causes.closing).toBe('Ce n’est pas une note du site.');
  });

  it('n’invente pas de cause et n’affiche le seuil que sous 50 %', () => {
    const view = explainUntested({
      coverage: 0.5,
      findings: [row(null)],
    });
    expect(view.coverageNote).toBeNull();
    expect(view.causes.primary).toBeNull();
    expect(view.causes.closing).toBe('Ce n’est pas une note du site.');
  });

  it('relie Search Console à la cause déjà prévue', () => {
    const view = explainUntested({
      coverage: 0,
      findings: [row('seo.gsc.untested_connect')],
    });
    expect(view.causes.primary?.searchConsole).toBe(true);
    expect(view.causes.primary?.text).toBe('Search Console n’est pas reliée.');
  });
});

describe('publicCoverageNote', () => {
  it('ne reprend pas les causes internes', () => {
    expect(publicCoverageNote(0.2)).toBe(
      'Moins de la moitié des tests ont abouti. Ce domaine n’a pas de note.',
    );
    expect(publicCoverageNote(0.5)).toBeNull();
    expect(publicCoverageNote(null)).toBeNull();
    expect(publicCoverageNote(0.2)).not.toMatch(
      /navigateur|PageSpeed|Search Console|clé/,
    );
  });
});
