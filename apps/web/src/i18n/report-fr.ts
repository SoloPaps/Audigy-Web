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
} as const;

export type ReportKey = keyof typeof REPORT;

export function tReport(key: ReportKey): string {
  return REPORT[key];
}
