import { describe, expect, it } from 'vitest';
import {
  type BriefDocument,
  type BriefFinding,
  recognizedStack,
  renderBrief,
  sameSentence,
} from './brief.js';
import type { MethodeEntry } from './methode-catalog.js';

function finding(partial: Partial<BriefFinding> = {}): BriefFinding {
  return {
    id: 'securite.hsts-0',
    checkId: 'securite.hsts',
    title: 'Garder le navigateur en adresse chiffrée',
    statusLabel: 'Problème',
    proof: 'L’en-tête manque.',
    impact: null,
    terminal: 'rien',
    ...partial,
  };
}

function doc(partial: Partial<BriefDocument> = {}): BriefDocument {
  const catalog = new Map<string, MethodeEntry>([
    [
      'securite.hsts',
      {
        id: 'securite.hsts',
        pass: 'En-tête présent, max-age d’au moins six mois.',
        criterion: null,
        citation: 'MDN HTTP Observatory',
      },
    ],
  ]);
  return {
    url: 'https://exemple.fr/chemin',
    at: new Date('2026-10-23T12:30:00Z'),
    stack: null,
    findings: [finding()],
    catalog,
    sources: new Map(),
    includeTerminal: false,
    ...partial,
  };
}

describe('renderBrief', () => {
  it('suit les six titres, dans cet ordre', () => {
    const text = renderBrief(doc());
    const titles = [
      'Rôle',
      'Contexte du site',
      'Constats',
      'Référentiel',
      'Attendu',
      'Garde-fous',
    ];
    let cursor = -1;
    for (const title of titles) {
      const at = text.indexOf(title);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(text).not.toContain('Terminal');
    expect(text).toContain('Vous corrigez le site https://exemple.fr/chemin');
    expect(text).toContain('Adresse : https://exemple.fr/chemin.');
    expect(text).toContain('Audit du 23 oct. 2026, 14 h 30.');
    expect(text).not.toContain('Technique reconnue');
    expect(text).toContain('Statut : Problème.');
    expect(text).toContain('Preuve : L’en-tête manque.');
    expect(text).not.toContain('Pour la personne');
    expect(text).toContain('Test : securite.hsts.');
    expect(text).toContain(
      'Réussi veut dire : En-tête présent, max-age d’au moins six mois.',
    );
    expect(text).toContain('Référence déjà notée : MDN HTTP Observatory.');
    expect(text).not.toContain('Critère :');
    expect(text).toContain('Ne recopiez aucun secret.');
    expect(text).toContain('N’inventez pas de note.');
  });

  it('omet la pile, la citation et la définition absentes', () => {
    const text = renderBrief(
      doc({
        at: null,
        catalog: new Map(),
        findings: [finding({ checkId: 'qualite.liens' })],
      }),
    );
    expect(text).not.toContain('Audit du');
    expect(text).not.toContain('Technique reconnue');
    expect(text).not.toContain('Réussi veut dire');
    expect(text).not.toContain('Référence déjà notée');
    expect(text).toContain('Test : qualite.liens.');
    expect(text).not.toMatch(/OWASP/);
  });

  it('préfère la source déjà affichée, et n’écrit pas deux fois la même phrase', () => {
    expect(sameSentence('  Même phrase. ', 'même phrase.')).toBe(true);
    const text = renderBrief(
      doc({
        sources: new Map([
          [
            'securite.hsts',
            [{ label: 'MDN', url: 'https://developer.mozilla.org/fr/' }],
          ],
        ]),
        findings: [
          finding({
            proof: 'Même phrase.',
            impact: 'même phrase.',
          }),
        ],
      }),
    );
    expect(text).toContain(
      'Référence déjà notée : MDN — https://developer.mozilla.org/fr/.',
    );
    expect(text).not.toContain('MDN HTTP Observatory');
    expect(text).not.toContain('Pour la personne');
  });

  it('ajoute l’impact seulement s’il est une autre phrase', () => {
    const text = renderBrief(
      doc({
        findings: [
          finding({
            proof: 'L’en-tête manque.',
            impact: 'Le navigateur peut retomber en clair.',
          }),
        ],
      }),
    );
    expect(text).toContain(
      'Pour la personne : Le navigateur peut retomber en clair.',
    );
  });

  it('reconnaît la technique seulement si l’audit l’a déjà listée', () => {
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.pass',
          params: { liste: 'nginx' },
        },
      ]),
    ).toBe('nginx');
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.pass_aucune',
          params: {},
        },
      ]),
    ).toBeNull();
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.warn',
          params: { liste: 'Apache/2.4.1' },
        },
      ]),
    ).toBe('Apache/2.4.1');
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.fail',
          params: { liste: 'nginx 1.24' },
        },
      ]),
    ).toBe('nginx 1.24');
    expect(
      recognizedStack([
        {
          checkId: 'securite.technologies',
          messageKey: 'securite.technologies.fail',
          params: { liste: '   ' },
        },
      ]),
    ).toBeNull();
    const text = renderBrief(doc({ stack: 'nginx 1.24' }));
    expect(text).toContain('Technique reconnue : nginx 1.24.');
    expect(text).not.toMatch(/\brm\b/);
    expect(text).not.toContain('GH_DISPATCH_TOKEN');
  });

  it('garde l’ordre reçu et le critère RGESN copié', () => {
    const text = renderBrief(
      doc({
        findings: [
          finding({ id: 'a', title: 'Second', checkId: 'seo.title' }),
          finding({
            id: 'b',
            title: 'Premier',
            checkId: 'ecologie.rgesn_budget',
          }),
        ],
        catalog: new Map([
          [
            'ecologie.rgesn_budget',
            {
              id: 'ecologie.rgesn_budget',
              pass: '≤ 1 Mio et ≤ 30 requêtes',
              criterion: '6.1 — Poids et nombre de requêtes, plafonds absolus.',
              citation: 'référentiel général d’écoconception',
            },
          ],
        ]),
      }),
    );
    expect(text.indexOf('Second')).toBeLessThan(text.indexOf('Premier'));
    expect(text).toContain(
      'Critère : 6.1 — Poids et nombre de requêtes, plafonds absolus.',
    );
  });

  it('n’ajoute Terminal que si on le demande et qu’un constat n’est pas Rien', () => {
    const withMode = doc({
      includeTerminal: true,
      findings: [finding({ terminal: 'verif' })],
    });
    expect(renderBrief(withMode)).toContain('Terminal');
    expect(renderBrief(withMode)).toContain('Vérif');
    expect(renderBrief({ ...withMode, includeTerminal: false })).not.toContain(
      'Terminal',
    );
    expect(
      renderBrief(
        doc({
          includeTerminal: true,
          findings: [finding({ terminal: 'rien' })],
        }),
      ),
    ).not.toContain('Terminal');
  });
});
