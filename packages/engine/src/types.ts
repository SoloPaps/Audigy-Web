import type {
  DohResolver,
  RequestBudget,
  SafeFetch,
  TlsProbe,
} from '@audigy/net';

export const METHOD_VERSION = '2026.1';

export const DOMAINS = [
  'performance',
  'seo',
  'securite',
  'ecologie',
  'accessibilite',
  'qualite',
  'vie_privee',
  'dns_email',
  'reputation',
  'disponibilite',
] as const;
export type Domain = (typeof DOMAINS)[number];

/** Domaines comptés dans le score global (Q21) ; Réputation et Disponibilité sont à part. */
export const MAIN_DOMAINS: readonly Domain[] = [
  'performance',
  'seo',
  'securite',
  'ecologie',
  'accessibilite',
  'qualite',
  'vie_privee',
  'dns_email',
];

export const STATUSES = ['pass', 'warn', 'fail', 'untested', 'na'] as const;
export type Status = (typeof STATUSES)[number];

export const NEEDS = [
  'http',
  'dns',
  'tls',
  'psi',
  'crux',
  'browser',
  'gsc',
  'places',
] as const;
export type Need = (typeof NEEDS)[number];

export type Mode = 'passive' | 'active';
export type Hosting = 'netlify' | 'github_pages' | 'other';

export interface Target {
  url: URL;
  scope: 'origin' | 'path';
  hosting: Hosting;
}

/** Artefacts partagés entre checks (page d'accueil, PSI, CrUX…) : chargés une seule fois par clé. */
export interface SharedArtifacts {
  get<T>(key: string, load: () => Promise<T>): Promise<T>;
  has(key: string): boolean;
}

export interface CheckContext {
  target: Target;
  /** Propriété vérifiée et revérifiée il y a moins de 10 min. */
  verified: boolean;
  net: { fetch: SafeFetch; dns: DohResolver; tls: TlsProbe };
  shared: SharedArtifacts;
  budget: RequestBudget;
  now(): Date;
  /** Interrompu quand le délai du check est dépassé. */
  signal: AbortSignal;
}

/** Contexte fourni au runner ; le runner ajoute `signal` pour chaque check. */
export type RunContext = Omit<CheckContext, 'signal'>;

export interface CheckResult {
  status: Status;
  /** 0..1 (défaut : pass 1, warn 0,5, fail 0). */
  score?: number;
  /** 4 = le plus grave. */
  severity: 1 | 2 | 3 | 4;
  impact: 1 | 2 | 3;
  measured?: Record<string, unknown>;
  /** Clé i18n du constat. */
  messageKey: string;
  params?: Record<string, string | number>;
  fixKey?: string;
  /** Clé i18n expliquant un `untested` ou `na`. */
  reason?: string;
}

export interface Check {
  /** `<domaine>.<nom>`, ex. `securite.hsts`. */
  id: string;
  domain: Domain;
  /** `active` exige un site vérifié. */
  mode: Mode;
  needs: readonly Need[];
  weight: 1 | 2 | 3;
  /** Délai propre au check, sinon celui du runner. */
  timeoutMs?: number;
  run(ctx: CheckContext): Promise<CheckResult>;
}

export interface CheckOutcome {
  checkId: string;
  domain: Domain;
  mode: Mode;
  weight: 1 | 2 | 3;
  result: CheckResult;
}
