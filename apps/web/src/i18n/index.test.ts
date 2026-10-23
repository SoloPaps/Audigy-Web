import { describe, expect, it } from 'vitest';
import { fr, type MessageKey, t } from './index.js';

type MissingKeyRejected = string extends Parameters<typeof t>[0] ? never : true;

function refuseCleInconnue(): void {
  // @ts-expect-error clé absente du dictionnaire
  t('cle.inexistante');
  // @ts-expect-error paramètre manquant
  t('measure.lcp');
}

describe('t', () => {
  it('refuse une clé inconnue au typage', () => {
    const locked = true satisfies MissingKeyRejected;
    expect(locked).toBe(true);
    expect(refuseCleInconnue).toBeTypeOf('function');
  });

  it('retourne le texte français', () => {
    expect(t('home.title')).toBe('Audigy');
    expect(t('home.headline')).toBe(
      'Vérifiez la santé de votre site, gratuitement.',
    );
    expect(t('home.submit')).toBe("Lancer l'audit");
    expect(t('finding.effort', { minutes: 20 })).toBe('20 min');
    expect(t('finding.untested')).toBe("Nous n'avons pas pu tester ce point.");
  });

  it('remplace les paramètres', () => {
    expect(t('measure.lcp', { duree: '6 s' })).toBe(
      "Votre site met 6 s à s'afficher (LCP).",
    );
  });

  it('signale un paramètre absent à l’exécution', () => {
    const params = {} as { duree: string };
    expect(() => t('measure.lcp', params)).toThrow(/duree/);
  });

  it('couvre chaque clé du dictionnaire', () => {
    for (const key of Object.keys(fr) as MessageKey[]) {
      expect(fr[key].length).toBeGreaterThan(0);
    }
  });
});
