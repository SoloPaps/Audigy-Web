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

  it('pose les phrases Arc Soft du compte et de la connexion', () => {
    expect(t('login.card.title')).toBe('Recevoir un lien de connexion');
    expect(t('login.submit')).toBe('Envoyer le lien');
    expect(t('login.sent')).toBe(
      'Le lien arrive dans votre boîte. Il expire tout seul.',
    );
    expect(t('account.export.hint')).toBe(
      'Le fichier contient vos sites, vos rapports et l’historique.',
    );
    expect(
      t('account.terms.when', { date: '23 oct. 2026', version: '1' }),
    ).toBe('Acceptées le 23 oct. 2026, version 1.');
    expect(t('account.delete.confirm')).toBe(
      'Cette action efface vos sites, vos rapports et vos fichiers. Elle est définitive.',
    );
    expect(t('account.delete.cancel')).toBe('Annuler');
    expect(t('account.delete.forever')).toBe('Supprimer définitivement');
    expect(t('login.lead')).toBe(
      'Indiquez votre e-mail. Nous vous envoyons un lien, sans mot de passe.',
    );
    expect(t('account.lead')).toBe(
      'Gérez l’export de vos données et la suppression du compte.',
    );
    expect(t('footer.note')).toBe(
      'Outil gratuit. Aucun traceur. Polices hébergées ici.',
    );
    expect(t('domain.dns_email.plain')).toBe('Nom et courrier');
    expect(t('print.link')).toBe('Imprimer');
  });

  it('couvre chaque clé du dictionnaire', () => {
    for (const key of Object.keys(fr) as MessageKey[]) {
      expect(fr[key].length).toBeGreaterThan(0);
    }
  });
});
