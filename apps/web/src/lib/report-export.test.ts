import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import {
  correctionPrompt,
  type ExportReport,
  markdownFilename,
  presentFinding,
  renderMarkdown,
} from './report-export.js';

const at = new Date('2026-10-23T22:30:00.000Z');

function ownerReport(): ExportReport {
  return {
    url: 'https://exemple.fr/chemin',
    at,
    methodVersion: '2026.1',
    globalScore: null,
    publicView: false,
    domains: [
      {
        label: 'Vie privée',
        score: null,
        detail: 'Nous n’avons pas pu vérifier la vie privée.',
        coverageNote: t('domain.cause.coverage'),
        causes: {
          primary: t('domain.cause.browser'),
          others: [t('domain.cause.psi')],
          closing: t('domain.cause.closing'),
        },
      },
    ],
    findings: [
      {
        title: 'Forcer l’adresse chiffrée',
        statusLabel: 'Problème',
        statement: 'Sans chiffrement, le réseau peut lire les échanges.',
        limit: null,
      },
    ],
  };
}

describe('limite du constat', () => {
  it('détache la phrase de couverture déjà écrite', () => {
    const text = t('ecologie.hebergeur.pass_anonyme');
    expect(presentFinding(text, null, text)).toEqual({
      statement: 'L’annuaire indique un hébergeur à électricité renouvelable.',
      limit: 'Cela ne couvre pas toute la chaîne d’hébergement.',
    });
  });

  it('laisse le certificat dans le constat', () => {
    const text = t('securite.certificate.fail_hostname');
    expect(presentFinding(text, null, text)).toEqual({
      statement: text,
      limit: null,
    });
  });

  it('ne répète pas la raison qui est déjà le constat', () => {
    const reason = t('reason.runner_absent');
    expect(presentFinding(reason, t('domain.cause.browser'), reason)).toEqual({
      statement: reason,
      limit: null,
    });
  });

  it('ajoute la cause française quand le constat est autre', () => {
    const why = 'Sans chiffrement, le réseau peut lire les échanges.';
    expect(presentFinding(why, t('domain.cause.psi'), null)).toEqual({
      statement: why,
      limit: t('domain.cause.psi'),
    });
  });
});

describe('markdown', () => {
  it('nomme le fichier par l’hôte et le jour de Paris', () => {
    expect(markdownFilename('https://Exemple.FR/a', at)).toBe(
      'audigy-exemple.fr-2026-10-24.md',
    );
    expect(markdownFilename('https://user:pw@exemple.fr/secret', at)).toBe(
      'audigy-exemple.fr-2026-10-24.md',
    );
    expect(markdownFilename('pas une adresse', at)).not.toMatch(/secret|uuid/u);
  });

  it('finit par la phrase qui refuse la valeur de preuve', () => {
    const body = renderMarkdown(ownerReport());
    const rows = body.trimEnd().split('\n');
    expect(rows.at(-1)).toBe('Ce fichier n’est pas une preuve.');
    expect(body).toContain(formatDateTime(at));
    expect(body).toContain('Méthode 2026.1');
    expect(body).toContain('Score global : Non testé');
    expect(body).toContain('Vie privée : Non testé');
    expect(body).toContain(t('domain.cause.browser'));
    expect(body).toContain(t('domain.cause.psi'));
    expect(body).toContain('Forcer l’adresse chiffrée');
    expect(body).toContain('Problème');
    expect(body).not.toContain('Limite :');
    expect(body).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu,
    );
  });

  it('retire les causes internes du score public', () => {
    const body = renderMarkdown({
      ...ownerReport(),
      publicView: true,
      globalScore: 72,
      findings: [],
      securityHeading: t('score.security.title'),
      securityLines: [t('score.security.hidden')],
    });
    expect(body).toContain('Score global : 72');
    expect(body).toContain(t('domain.cause.coverage'));
    expect(body).toContain(t('score.security.hidden'));
    expect(body).not.toContain(t('domain.cause.browser'));
    expect(body).not.toContain(t('domain.cause.psi'));
    expect(body).not.toContain('Search Console');
    expect(body).not.toMatch(/clé/iu);
    expect(body.trimEnd().endsWith('Ce fichier n’est pas une preuve.')).toBe(
      true,
    );
  });
});

describe('prompt de correction', () => {
  it('reprend le correctif déjà montré et les trois consignes', () => {
    const text = correctionPrompt({
      url: 'https://exemple.fr',
      title: 'Forcer l’adresse chiffrée',
      statement: 'Sans chiffrement, le réseau peut lire les échanges.',
      limit: null,
      steps: ['Activez le certificat.'],
      code: 'Strict-Transport-Security: max-age=1',
    });
    expect(text).toBe(
      [
        'Adresse : https://exemple.fr',
        'Titre : Forcer l’adresse chiffrée',
        'Constat : Sans chiffrement, le réseau peut lire les échanges.',
        'Limite : Aucune limite signalée.',
        'Étape : Activez le certificat.',
        'Correctif : Strict-Transport-Security: max-age=1',
        'Proposez des étapes que le propriétaire peut faire.',
        'N’inventez pas de note.',
        'Ne proposez pas de test sur le site.',
      ].join('\n'),
    );
  });

  it('écrit la limite quand elle diffère du constat', () => {
    const text = correctionPrompt({
      url: 'https://exemple.fr',
      title: 'Hébergeur',
      statement: 'L’annuaire indique un hébergeur à électricité renouvelable.',
      limit: 'Cela ne couvre pas toute la chaîne d’hébergement.',
      steps: ['Vérifiez l’hébergeur.'],
    });
    expect(text).toContain(
      'Limite : Cela ne couvre pas toute la chaîne d’hébergement.',
    );
    expect(text).not.toContain('Aucune limite signalée.');
  });
});
