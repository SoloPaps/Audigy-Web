import type { REPORT_DOMAINS } from './domains.js';

type DomainId = (typeof REPORT_DOMAINS)[number];

export const HOME_EXAMPLE_SCORE = 72;

export const HOME_EXAMPLE_ROWS = [
  { key: 'domain.seo.plain', score: 64 },
  { key: 'home.example.https', score: 86 },
] as const;

export const HOME_OFFER_SCORES: Record<DomainId, number> = {
  performance: 72,
  seo: 64,
  securite: 58,
  ecologie: 81,
  accessibilite: 76,
  qualite: 83,
  vie_privee: 69,
  dns_email: 44,
};
