import { type MessageKey, t } from '../i18n/index.js';
import type { Level } from './score.js';

/** Les 8 domaines du score global. Réputation et disponibilité restent à part. */
export const REPORT_DOMAINS = [
  'performance',
  'seo',
  'securite',
  'ecologie',
  'accessibilite',
  'qualite',
  'vie_privee',
  'dns_email',
] as const;

const PLAIN: Record<string, MessageKey> = {
  performance: 'domain.performance.plain',
  seo: 'domain.seo.plain',
  securite: 'domain.securite.plain',
  ecologie: 'domain.ecologie.plain',
  accessibilite: 'domain.accessibilite.plain',
  qualite: 'domain.qualite.plain',
  vie_privee: 'domain.vie_privee.plain',
  dns_email: 'domain.dns_email.plain',
  reputation: 'domain.reputation.plain',
  disponibilite: 'domain.disponibilite.plain',
};

const TECH: Record<string, MessageKey> = {
  performance: 'domain.performance.tech',
  seo: 'domain.seo.tech',
  securite: 'domain.securite.tech',
  ecologie: 'domain.ecologie.tech',
  accessibilite: 'domain.accessibilite.tech',
  qualite: 'domain.qualite.tech',
  vie_privee: 'domain.vie_privee.tech',
  dns_email: 'domain.dns_email.tech',
  reputation: 'domain.reputation.tech',
  disponibilite: 'domain.disponibilite.tech',
};

const SENTENCE: Record<string, Record<Level, MessageKey>> = {
  performance: {
    good: 'domain.performance.good',
    improve: 'domain.performance.improve',
    problem: 'domain.performance.problem',
    untested: 'domain.performance.untested',
  },
  seo: {
    good: 'domain.seo.good',
    improve: 'domain.seo.improve',
    problem: 'domain.seo.problem',
    untested: 'domain.seo.untested',
  },
  securite: {
    good: 'domain.securite.good',
    improve: 'domain.securite.improve',
    problem: 'domain.securite.problem',
    untested: 'domain.securite.untested',
  },
  ecologie: {
    good: 'domain.ecologie.good',
    improve: 'domain.ecologie.improve',
    problem: 'domain.ecologie.problem',
    untested: 'domain.ecologie.untested',
  },
  accessibilite: {
    good: 'domain.accessibilite.good',
    improve: 'domain.accessibilite.improve',
    problem: 'domain.accessibilite.problem',
    untested: 'domain.accessibilite.untested',
  },
  qualite: {
    good: 'domain.qualite.good',
    improve: 'domain.qualite.improve',
    problem: 'domain.qualite.problem',
    untested: 'domain.qualite.untested',
  },
  vie_privee: {
    good: 'domain.vie_privee.good',
    improve: 'domain.vie_privee.improve',
    problem: 'domain.vie_privee.problem',
    untested: 'domain.vie_privee.untested',
  },
  dns_email: {
    good: 'domain.dns_email.good',
    improve: 'domain.dns_email.improve',
    problem: 'domain.dns_email.problem',
    untested: 'domain.dns_email.untested',
  },
  reputation: {
    good: 'domain.reputation.good',
    improve: 'domain.reputation.improve',
    problem: 'domain.reputation.problem',
    untested: 'domain.reputation.untested',
  },
  disponibilite: {
    good: 'domain.disponibilite.good',
    improve: 'domain.disponibilite.improve',
    problem: 'domain.disponibilite.problem',
    untested: 'domain.disponibilite.untested',
  },
};

const GENERIC: Record<Level, MessageKey> = {
  good: 'domain.sentence.good',
  improve: 'domain.sentence.improve',
  problem: 'domain.sentence.problem',
  untested: 'domain.sentence.untested',
};

export function domainPlain(id: string): string {
  const key = PLAIN[id];
  return key ? t(key) : id;
}

export function domainTech(id: string): string {
  const key = TECH[id];
  return key ? t(key) : id;
}

export function domainSentence(id: string, level: Level): string {
  const key = SENTENCE[id]?.[level] ?? GENERIC[level];
  return t(key);
}

export function isKnownDomain(id: string): boolean {
  return Object.hasOwn(PLAIN, id);
}
