import { z } from 'zod';

/** Version du format de sortie. Tout changement incompatible l'incrémente. */
export const BROWSER_RESULT_VERSION = 1;

/** Clé de `ctx.shared` sous laquelle le moteur range la sortie du runner. */
export const BROWSER_SHARED_KEY = 'browser';

/** Chemin du rapport dans le seau privé `artifacts`, relu par l'orchestration. */
export function browserResultsPath(auditId: string): string {
  return `${auditId}/browser/results.json`;
}

export const VIEWPORTS = ['desktop', 'mobile'] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/**
 * `network` : demandé au site par `safeFetch`. `cache` : déjà reçu pendant l'audit.
 * `stubbed` : envoi refusé (POST, balise…), réponse vide locale, rien ne part.
 * `blocked` : refusé par l'anti-SSRF, le budget ou le schéma. `error` : échec réseau.
 */
export const REQUEST_OUTCOMES = [
  'network',
  'cache',
  'stubbed',
  'blocked',
  'error',
] as const;
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number];

const isoDate = z.iso.datetime();
const bytes = z.number().int().nonnegative();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const RequestRecordSchema = z.strictObject({
  url: z.string().max(2048),
  method: z.string().min(1).max(16),
  resourceType: z.string().max(32),
  host: z.string().max(255),
  thirdParty: z.boolean(),
  outcome: z.enum(REQUEST_OUTCOMES),
  status: z.number().int().nullable(),
  mimeType: z.string().max(128).nullable(),
  transferBytes: bytes,
  /** Code d'erreur stable (`BLOCKED_ADDRESS`, `BUDGET_EXCEEDED`, `METHOD`…). */
  reason: z.string().max(64).nullable(),
});
export type RequestRecord = z.infer<typeof RequestRecordSchema>;

export const EcoMetricsSchema = z.strictObject({
  /** Éléments du DOM, hors descendants des `svg` (méthode EcoIndex). */
  domElements: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative(),
  /** Octets reçus sur le réseau (corps compressés). */
  transferBytes: bytes,
  /** Une requête a été refusée faute de budget : les chiffres sont des minima. */
  truncated: z.boolean(),
});
export type EcoMetrics = z.infer<typeof EcoMetricsSchema>;

export const ScreenshotSchema = z.strictObject({
  viewport: z.enum(VIEWPORTS),
  file: z.string().regex(/^[a-z0-9-]+\.webp$/),
  format: z.literal('webp'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes,
  sha256,
});
export type Screenshot = z.infer<typeof ScreenshotSchema>;

export const PageLoadSchema = z.strictObject({
  viewport: z.enum(VIEWPORTS),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  userAgent: z.string().max(512),
  status: z.number().int().nullable(),
  finalUrl: z.string().max(2048).nullable(),
  timedOut: z.boolean(),
  error: z.string().max(64).nullable(),
  requests: z.array(RequestRecordSchema).max(1000),
  eco: EcoMetricsSchema.nullable(),
  screenshot: ScreenshotSchema.nullable(),
});
export type PageLoad = z.infer<typeof PageLoadSchema>;

export const CookieRecordSchema = z.strictObject({
  name: z.string().max(256),
  domain: z.string().max(255),
  path: z.string().max(1024),
  thirdParty: z.boolean(),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  sameSite: z.enum(['Strict', 'Lax', 'None']),
  /** `null` : trace de session. */
  expires: isoDate.nullable(),
  lifetimeDays: z.number().nonnegative().nullable(),
  /** `header` : posé par une réponse HTTP. `script` : posé par du code dans la page. */
  setBy: z.enum(['header', 'script']),
  /** La valeur n'est jamais conservée, seulement sa longueur. */
  valueLength: z.number().int().nonnegative(),
});
export type CookieRecord = z.infer<typeof CookieRecordSchema>;

export const CmpMatchSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().max(64),
  evidence: z.array(z.string().max(300)).min(1).max(20),
});
export type CmpMatch = z.infer<typeof CmpMatchSchema>;

export const ConsoleEntrySchema = z.strictObject({
  source: z.enum(['console', 'pageerror']),
  text: z.string().max(500),
  url: z.string().max(2048).nullable(),
  /** Erreur provoquée par un refus du runner (anti-SSRF, budget), pas par le site. */
  runnerCaused: z.boolean(),
});
export type ConsoleEntry = z.infer<typeof ConsoleEntrySchema>;

export const MixedContentSchema = z.strictObject({
  url: z.string().max(2048),
  /** `blocked` : refusé par le navigateur. `upgraded` : passé en HTTPS d'office. `loaded` : chargé en clair. */
  kind: z.enum(['blocked', 'upgraded', 'loaded']),
  resourceType: z.string().max(32).nullable(),
});
export type MixedContent = z.infer<typeof MixedContentSchema>;

const AxeNodeSchema = z.strictObject({
  target: z.array(z.string().max(300)).max(10),
  html: z.string().max(300),
});

export const AxeRuleSchema = z.strictObject({
  id: z.string().max(64),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']).nullable(),
  tags: z.array(z.string().max(64)).max(40),
  help: z.string().max(300),
  helpUrl: z.string().max(300),
  nodeCount: z.number().int().nonnegative(),
  nodes: z.array(AxeNodeSchema).max(20),
});
export type AxeRule = z.infer<typeof AxeRuleSchema>;

export const AxeSummarySchema = z.strictObject({
  version: z.string().max(32),
  url: z.string().max(2048),
  violations: z.array(AxeRuleSchema),
  incomplete: z.array(AxeRuleSchema),
  passes: z.array(z.string().max(64)),
  inapplicable: z.array(z.string().max(64)),
});
export type AxeSummary = z.infer<typeof AxeSummarySchema>;

export const RGAA_STATUSES = [
  'fail',
  'incomplete',
  'passed_auto',
  'inapplicable',
  'not_run',
] as const;
export type RgaaStatus = (typeof RGAA_STATUSES)[number];

export const RgaaSummarySchema = z.strictObject({
  version: z.string().max(16),
  criteriaTotal: z.number().int().positive(),
  criteriaMapped: z.number().int().nonnegative(),
  /** La couverture automatique est partielle : un critère « passed_auto » reste à vérifier à la main. */
  coverage: z.literal('partial'),
  criteria: z.array(
    z.strictObject({
      id: z.string().regex(/^\d{1,2}\.\d{1,2}$/),
      status: z.enum(RGAA_STATUSES),
      rules: z.array(z.string().max(64)).min(1),
      failedRules: z.array(z.string().max(64)),
    }),
  ),
});
export type RgaaSummary = z.infer<typeof RgaaSummarySchema>;

export const StepErrorSchema = z.strictObject({
  step: z.enum([
    'navigation',
    'axe',
    'cmp',
    'cookies',
    'storage',
    'eco',
    'screenshot',
  ]),
  viewport: z.enum(VIEWPORTS),
  message: z.string().max(300),
});
export type StepError = z.infer<typeof StepErrorSchema>;

export const BrowserAuditResultSchema = z.strictObject({
  version: z.literal(BROWSER_RESULT_VERSION),
  mode: z.literal('passive'),
  runner: z.strictObject({
    name: z.literal('audigy-browser'),
    browser: z.string().max(64),
    axe: z.string().max(32),
    /** User-Agent envoyé au site par `safeFetch`. */
    fetchUserAgent: z.string().max(256),
  }),
  target: z.strictObject({
    url: z.string().max(2048),
    finalUrl: z.string().max(2048).nullable(),
    secure: z.boolean(),
  }),
  startedAt: isoDate,
  finishedAt: isoDate,
  loads: z.strictObject({
    desktop: PageLoadSchema,
    mobile: PageLoadSchema.nullable(),
  }),
  /** Profil vierge, aucune interaction : tout ce qui suit est antérieur à un choix de consentement. */
  preConsent: z.strictObject({
    cookies: z.array(CookieRecordSchema).max(500),
    localStorage: z.array(z.string().max(256)).max(200),
    sessionStorage: z.array(z.string().max(256)).max(200),
    thirdPartyHosts: z.array(z.string().max(255)).max(500),
    thirdPartyRequests: z.number().int().nonnegative(),
  }),
  cmp: z.strictObject({
    detected: z.array(CmpMatchSchema),
    tcfApi: z.boolean(),
    /** Intitulés visibles des boutons du bandeau, au premier niveau. */
    buttons: z.array(z.string().max(80)).max(20),
  }),
  console: z.array(ConsoleEntrySchema).max(100),
  mixedContent: z.array(MixedContentSchema).max(200),
  axe: AxeSummarySchema.nullable(),
  rgaa: RgaaSummarySchema.nullable(),
  limits: z.strictObject({
    blockedRequests: z.number().int().nonnegative(),
    budgetExhausted: z.boolean(),
  }),
  errors: z.array(StepErrorSchema),
});
export type BrowserAuditResult = z.infer<typeof BrowserAuditResultSchema>;

export function parseBrowserAuditResult(input: unknown): BrowserAuditResult {
  return BrowserAuditResultSchema.parse(input);
}
