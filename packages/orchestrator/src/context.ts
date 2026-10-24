import {
  ACCESSIBILITE_CHECKS,
  ACTIVE_SECURITE_CHECKS,
  type Check,
  createRegistry,
  createReputationChecks,
  createSharedArtifacts,
  DEFAULT_AVAILABLE,
  DNS_EMAIL_CHECKS,
  ECOLOGIE_CHECKS,
  googleApiKey,
  type Need,
  PERFORMANCE_CHECKS,
  type PlacesCache,
  placesApiKey,
  QUALITE_CHECKS,
  type RunContext,
  SECURITE_CHECKS,
  SEO_CHECKS,
  type Target,
  TECHNOLOGIES_CHECKS,
  VIE_PRIVEE_CHECKS,
  withExternalApi,
} from '@audigy/engine';
import {
  createDohResolver,
  createRequestBudget,
  createSafeFetch,
  createTlsProbe,
  DEFAULT_MAX_REQUESTS,
  type RequestBudgetOptions,
} from '@audigy/net';
import { type LabConfig, labNet } from './lab.js';

/**
 * Checks enregistrés. Sans `PLACES_API_KEY`, Réputation n’est pas dans la liste :
 * la section reste masquée.
 */
export function defaultChecks(
  env: NodeJS.ProcessEnv = process.env,
  placesCache?: PlacesCache,
): Check[] {
  const checks: Check[] = [
    ...SECURITE_CHECKS,
    ...ACTIVE_SECURITE_CHECKS,
    ...TECHNOLOGIES_CHECKS,
    ...PERFORMANCE_CHECKS,
    ...SEO_CHECKS,
    ...ACCESSIBILITE_CHECKS,
    ...DNS_EMAIL_CHECKS,
    ...ECOLOGIE_CHECKS,
    ...QUALITE_CHECKS,
    ...VIE_PRIVEE_CHECKS,
  ];
  if (placesApiKey(env)) {
    checks.push(
      ...createReputationChecks({
        apiKey: () => placesApiKey(env),
        ...(placesCache ? { cache: placesCache } : {}),
      }),
    );
  }
  return createRegistry(checks).list();
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

/**
 * Sondes actives (fichiers, dossiers) en plus du plafond passif.
 * Le parcours passif reste borné par ses propres limites de pages.
 */
export const ACTIVE_EXTRA_REQUESTS = 100;

/** Contexte d'un audit : un budget, un `safeFetch` (IP épinglées) et des artefacts partagés. */
export function createAuditContext(options: AuditContextOptions): AuditContext {
  const env = options.env ?? process.env;
  const budget = createRequestBudget({
    ...options.budget,
    maxRequests:
      options.budget?.maxRequests ??
      (options.verified
        ? DEFAULT_MAX_REQUESTS + ACTIVE_EXTRA_REQUESTS
        : DEFAULT_MAX_REQUESTS),
  });
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
  // `gsc` reste proposé : sans jeton, le check dit de relier Search Console.
  const available: Need[] = [...DEFAULT_AVAILABLE, 'gsc'];
  if (googleApiKey(env)) available.push('psi', 'crux');
  if (placesApiKey(env)) available.push('places');
  return { ctx: options.lab ? ctx : withExternalApi(ctx), available };
}
