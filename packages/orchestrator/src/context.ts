import {
  type Check,
  createRegistry,
  createSharedArtifacts,
  DEFAULT_AVAILABLE,
  DNS_EMAIL_CHECKS,
  ECOLOGIE_CHECKS,
  googleApiKey,
  type Need,
  PERFORMANCE_CHECKS,
  QUALITE_CHECKS,
  type RunContext,
  SECURITE_CHECKS,
  SEO_CHECKS,
  type Target,
  TECHNOLOGIES_CHECKS,
  withExternalApi,
} from '@audigy/engine';
import {
  createDohResolver,
  createRequestBudget,
  createSafeFetch,
  createTlsProbe,
  type RequestBudgetOptions,
} from '@audigy/net';
import { type LabConfig, labNet } from './lab.js';

/** Tous les checks enregistrés à ce jour (PART-06 à 12). Les checks navigateur s'y ajouteront. */
export function defaultChecks(): Check[] {
  return createRegistry([
    ...SECURITE_CHECKS,
    ...TECHNOLOGIES_CHECKS,
    ...PERFORMANCE_CHECKS,
    ...SEO_CHECKS,
    ...DNS_EMAIL_CHECKS,
    ...ECOLOGIE_CHECKS,
    ...QUALITE_CHECKS,
  ]).list();
}

export interface AuditContextOptions {
  target: Target;
  verified: boolean;
  env?: NodeJS.ProcessEnv;
  lab?: LabConfig | null;
  /** Remplacements réseau (tests). */
  net?: Partial<RunContext['net']>;
  budget?: RequestBudgetOptions;
  now?: () => Date;
}

export interface AuditContext {
  ctx: RunContext;
  /** Sources disponibles côté fonction. `browser` n'y est jamais. */
  available: Need[];
}

/** Contexte d'un audit : un budget, un `safeFetch` (IP épinglées) et des artefacts partagés. */
export function createAuditContext(options: AuditContextOptions): AuditContext {
  const env = options.env ?? process.env;
  const budget = createRequestBudget(options.budget);
  const botUrl = env.APP_BASE_URL?.trim() || undefined;
  const base: RunContext['net'] = options.lab
    ? labNet(options.lab, budget)
    : {
        fetch: createSafeFetch({ budget, ...(botUrl ? { botUrl } : {}) }),
        dns: createDohResolver(),
        tls: createTlsProbe(),
      };
  const ctx: RunContext = {
    target: options.target,
    verified: options.verified,
    net: { ...base, ...options.net },
    shared: createSharedArtifacts(),
    budget,
    now: options.now ?? (() => new Date()),
  };
  const available: Need[] = [...DEFAULT_AVAILABLE];
  if (googleApiKey(env)) available.push('psi', 'crux');
  return { ctx: options.lab ? ctx : withExternalApi(ctx), available };
}
