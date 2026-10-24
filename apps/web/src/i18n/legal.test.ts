import { TERMS_VERSION } from '@audigy/db';
import { METHOD_VERSION } from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { fr } from './fr.js';

describe('textes légaux', () => {
  it('pose le mandat, le contact et le domaine choisis', () => {
    const texte = [
      fr['terms.owner.declare'],
      fr['terms.owner.active'],
      fr['terms.owner.article'],
      fr['terms.proof.bailiff'],
      fr['terms.proof.value'],
      fr['terms.proof.eidas'],
      fr['terms.proof.article'],
      fr['terms.proof.presumption'],
      fr['legal.email'],
      fr['legal.site'],
      fr['mentions.editor.body'],
      fr['mentions.host.body'],
      fr['legal.review'],
      fr['footer.mentions'],
      fr['footer.privacy'],
      fr['footer.terms'],
      fr['footer.a11y'],
      fr['footer.method.nav'],
    ].join(' ');
    expect(texte).toContain('propriétaire du site');
    expect(texte).toContain('mandaté par écrit');
    expect(texte).toContain('323-1');
    expect(texte).toContain('pas un constat de commissaire de justice');
    expect(texte).toContain('n’en a pas la valeur');
    expect(texte).toContain('eIDAS');
    expect(texte).toContain('41.1');
    expect(texte).toContain('41.2');
    expect(texte).toContain('AudigyWeb@outlook.fr');
    expect(texte).toContain('https://audigyweb.fr');
    expect(texte).toContain('particulier non professionnel');
    expect(texte).toContain('hébergeur');
    expect(fr['legal.review']).toContain('relire');
    expect(TERMS_VERSION).toBe('2026.1');
    expect(METHOD_VERSION).toBe('2026.1');
    expect(fr['method.version']).toBe(`Méthode ${METHOD_VERSION}.`);
  });
});
