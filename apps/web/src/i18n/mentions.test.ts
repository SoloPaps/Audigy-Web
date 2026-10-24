import { describe, expect, it } from 'vitest';
import { fr } from './fr.js';

describe('mentions §12.8', () => {
  it('décrit le constat et l’horodatage non qualifié', () => {
    const texte = [
      fr['verify.legal'],
      fr['verify.legal.value'],
      fr['verify.observed'],
      fr['verify.eidas'],
      fr['verify.eidas.recevable'],
      fr['verify.eidas.article'],
      fr['verify.eidas.presomption'],
    ].join(' ');
    expect(texte).toContain('pas un constat de commissaire de justice');
    expect(texte).toContain('n’en a pas la valeur');
    expect(texte).toContain('à la date indiquée');
    expect(texte).toContain('RFC 3161');
    expect(texte).toContain('non qualifié');
    expect(texte).toContain('eIDAS');
    expect(texte).toContain('41.1');
    expect(texte).toContain('41.2');
    expect(fr['verifier.mismatch']).toBe('Ce fichier ne correspond pas.');
  });
});
