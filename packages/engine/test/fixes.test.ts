import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  FixParseError,
  type FixStore,
  loadFixes,
  parseFix,
  variantFor,
} from '../src/index.js';

const TEST_DIR = fileURLToPath(new URL('./fixes/fr/', import.meta.url));

const VALID = `---
title: Titre
why: Pourquoi.
effortMinutes: 15
sources:
  - MDN | https://developer.mozilla.org/
---
## netlify
1. Netlify.
## github_pages
1. Pages.
## generic
1. Ailleurs.
`;

describe('parseFix', () => {
  it('lit en-tête et variantes', () => {
    expect(parseFix('seo.titre', VALID)).toEqual({
      id: 'seo.titre',
      title: 'Titre',
      why: 'Pourquoi.',
      effortMinutes: 15,
      sources: [{ label: 'MDN', url: 'https://developer.mozilla.org/' }],
      variants: {
        netlify: '1. Netlify.',
        github_pages: '1. Pages.',
        generic: '1. Ailleurs.',
      },
    });
  });

  it('accepte les fins de ligne Windows', () => {
    expect(parseFix('seo.titre', VALID.replace(/\n/g, '\r\n')).title).toBe(
      'Titre',
    );
  });

  it.each([
    ['sans en-tête', VALID.replace(/^---\n/, '')],
    ['en-tête non fermé', VALID.replace('---\n## netlify', '## netlify')],
    ['title manquant', VALID.replace('title: Titre\n', '')],
    ['why manquant', VALID.replace('why: Pourquoi.\n', '')],
    ['effort non entier', VALID.replace('15', '1.5')],
    ['effort nul', VALID.replace('15', '0')],
    ['source http', VALID.replace('https://developer', 'http://developer')],
    ['sans source', VALID.replace(/sources:\n.*\n/, 'sources:\n')],
    ['champ inconnu', VALID.replace('why:', 'auteur: x\nwhy:')],
    ['variante manquante', VALID.replace(/## generic\n.*\n/, '')],
    ['variante inconnue', `${VALID}## autre\nx\n`],
    ['variante en double', `${VALID}## netlify\nx\n`],
    ['variante vide', VALID.replace('1. Pages.', '')],
    [
      'texte hors variante',
      VALID.replace('---\n## netlify', '---\nIntro\n## netlify'),
    ],
  ])('refuse une fiche invalide (%s)', (_label, text) => {
    expect(() => parseFix('seo.titre', text)).toThrow(FixParseError);
  });

  it('refuse un identifiant invalide', () => {
    expect(() => parseFix('../secret', VALID)).toThrow(FixParseError);
  });
});

describe('variantFor', () => {
  it('choisit la variante de l’hébergeur, generic sinon', () => {
    const sheet = parseFix('seo.titre', VALID);
    expect(variantFor(sheet, 'netlify')).toBe('1. Netlify.');
    expect(variantFor(sheet, 'github_pages')).toBe('1. Pages.');
    expect(variantFor(sheet, 'other')).toBe('1. Ailleurs.');
  });
});

describe('loadFixes', () => {
  it('charge les fiches des checks factices depuis le disque', async () => {
    const fixes = await loadFixes(fileFixStore(TEST_DIR));
    expect([...fixes.keys()]).toEqual([
      'qualite.factice_passif',
      'securite.factice_actif',
    ]);
    expect(fixes.get('securite.factice_actif')?.effortMinutes).toBe(10);
  });

  it('le dossier des fiches du moteur est valide', async () => {
    await expect(loadFixes(fileFixStore(FIXES_FR_DIR))).resolves.toBeInstanceOf(
      Map,
    );
  });

  it('échoue sur une fiche invalide', async () => {
    const store: FixStore = {
      list: async () => ['seo.casse'],
      read: async () => 'pas de fiche',
    };
    await expect(loadFixes(store)).rejects.toThrow(/seo\.casse/);
  });

  it('refuse de lire hors du dossier', async () => {
    await expect(fileFixStore(TEST_DIR).read('../../x')).rejects.toThrow();
  });
});
