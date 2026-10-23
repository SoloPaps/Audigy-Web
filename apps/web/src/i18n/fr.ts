/**
 * Dictionnaire français. Une clé absente de cet objet
 * ne peut pas être passée à `t()` (erreur de typage).
 */
export const fr = {
  'home.title': 'Vérifiez la santé de votre site, gratuitement.',
  'home.submit': "Lancer l'audit",
  'level.good': 'Bon',
  'level.improve': 'À améliorer',
  'level.problem': 'Problème',
  'level.untested': 'Non testé',
  'status.pass': 'Réussi',
  'status.warn': 'À améliorer',
  'status.fail': 'Problème',
  'status.untested': 'Non testé',
  'status.na': 'Non applicable',
  'finding.untested': "Nous n'avons pas pu tester ce point.",
  'measure.lcp': "Votre site met {duree} à s'afficher (LCP).",
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof fr;
