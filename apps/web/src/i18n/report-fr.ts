import { packLine } from './pack.js';

/** Textes du rapport et de l’avancement. Hors dictionnaire accueil (budget 500 Ko). */
const REPORT = {
  'eta.long': 'Comptez encore 2 à 4 minutes.',
  'eta.mid': 'Comptez encore 1 à 3 minutes.',
  'eta.short': 'Comptez encore moins de 2 minutes.',
  'phase.queue': 'Phase : file d’attente.',
  'phase.dns': 'Phase : DNS.',
  'phase.pages': 'Phase : pages.',
  'phase.privacy': 'Phase : vie privée.',
  'phase.tail': 'Phase : dernières mesures.',
  'card.observatory': 'Les tests de protection suivent MDN HTTP Observatory.',
  'card.lighthouse': 'La vitesse et l’accessibilité utilisent Lighthouse.',
  'card.ecoindex': 'Le poids écologique s’appuie sur EcoIndex.',
  'card.trackers': 'Les traceurs connus viennent de Tracker Radar.',
  'card.doh': 'Les enregistrements DNS sont lus par DNS sur HTTPS.',
  'accessibilite.axe.pass':
    'Aucun écart automatique sur cette page. Ce n’est pas un audit RGAA complet.',
  'accessibilite.axe.fail':
    '{count} écarts automatiques, dont {rules}. Ce n’est pas un audit RGAA complet.',
  'accessibilite.axe.warn':
    '{count} points restent à vérifier, dont {rules}. Ce n’est pas un audit RGAA complet.',
  'accessibilite.axe.untested':
    'Nous n’avons pas pu tester : le navigateur d’audit n’a pas tourné.',
  'accessibilite.axe.absent':
    'Nous n’avons pas pu tester : la mesure automatique d’accès est absente.',
  'accessibilite.axe.invalid':
    'Nous n’avons pas pu tester : la mesure automatique d’accès est illisible.',
  'disponibilite.uptime.untested':
    'Nous n’avons pas encore assez de sondes pour un pourcentage.',
  'disponibilite.uptime.pct': '{pct} % des sondes ont répondu.',
  'rgesn.screen.title': 'Questionnaire d’écoconception',
  'rgesn.screen.lead':
    'Répondez seulement à ce que vous savez. Une question vide n’est pas un échec.',
  'rgesn.screen.submit': 'Enregistrer les réponses',
  'rgesn.screen.progress':
    '{answered} réponses sur {total}. Une question sans réponse n’est pas un échec.',
  'rgesn.screen.empty': 'Aucune réponse enregistrée. Ce n’est pas un échec.',
} as const;

export type ReportKey = keyof typeof REPORT;

export const REPORT_KEYS = Object.keys(REPORT) as ReportKey[];

export function tReport(key: ReportKey): string {
  return packLine(key) ?? REPORT[key];
}

export function reportLine(key: string): string | null {
  if (!Object.hasOwn(REPORT, key)) return null;
  return REPORT[key as ReportKey];
}
