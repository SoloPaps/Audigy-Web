/**
 * @audigy/orchestrator — file d'audits, exécution et écriture (PLAN §3, §5, §8).
 * Les fonctions Netlify (`netlify/functions/*`) et la CLI ne font qu'appeler ce paquet.
 *
 * API
 * - `handleCreate(req, deps)` : `POST /api/audits`, corps `{ url } | { siteId }` + `mode`
 *   (zod). Jeton Supabase en `Authorization: Bearer`. 202 créé, 200 audit existant
 *   (double clic : même site et même mode depuis moins de 15 min), 429 + `Retry-After`
 *   (10 par jour et par utilisateur, 1 par hôte et 15 min), 400, 401, 403, 404.
 *   Erreurs : `{ error, messageKey: 'api.error.<code>' }`.
 * - `handleGet(req, deps, id)` : `GET /api/audits/:id`, lecture sous RLS.
 * - `handleRun(req, deps)` : `audit-run-background`, réveil signé (`x-audigy-trigger`,
 *   HMAC de `SUPABASE_SERVICE_ROLE_KEY`), puis `processNextAudit`.
 * - `processNextAudit(deps)` : claim → checks côté fonction → `partial` → runner
 *   navigateur (GitHub `browser-audit.yml`) → attente ≤ 10 min → fusion → `done`.
 *   Runner absent : checks navigateur `untested`, raison `reason.runner_absent`.
 * - `createAuditContext`, `defaultChecks` : réseau `@audigy/net` réel, ou labo local.
 * - `normalizeSiteUrl` : adresse saisie → site (`https`, portée, hébergeur).
 * - `createLogger`, `redact` : journal JSON sans secret ni donnée personnelle.
 * - `apiDepsFromEnv`, `runDepsFromEnv` : dépendances depuis les noms du §9.
 * - Labo (`AUDIGY_LAB`, dev seulement) : `labFromEnv`, `labNet`. Noms `*.audigy.test`.
 */
export {
  type AuditContext,
  type AuditContextOptions,
  createAuditContext,
  defaultChecks,
} from './context.js';
export { type CreateDeps, type CreateResult, createAudit } from './create.js';
export {
  BROWSER_WORKFLOW,
  createGithubDispatcher,
  type Dispatcher,
  type DispatchResult,
} from './dispatch.js';
export {
  type ApiDeps,
  type ApiError,
  type AuditView,
  apiError,
  bearerToken,
  type FindingView,
  handleCreate,
  handleGet,
  handleRun,
  type RunDeps,
  serve,
} from './http.js';
export {
  LAB_ENV_NAME,
  type LabConfig,
  labApi,
  labConfigSchema,
  labDns,
  labFromEnv,
  labNet,
} from './lab.js';
export {
  createLogger,
  errorCode,
  type Logger,
  redact,
  SECRET_ENV_NAMES,
  secretsFromEnv,
} from './log.js';
export {
  type AuditSummary,
  assemble,
  type BrowserReason,
  browserPlaceholders,
  domainScoreRows,
  findingRows,
  needsBrowser,
  ORCHESTRATION_REASONS,
  runBrowserPhase,
  runServerPhase,
  splitChecks,
} from './pipeline.js';
export {
  type AuditStore,
  BACKGROUND_BUDGET_MS,
  type ClaimedAudit,
  type ProcessDeps,
  type ProcessResult,
  processNextAudit,
  RUNNER_POLL_MS,
  RUNNER_WAIT_MS,
  STALE_AFTER_MINUTES,
} from './process.js';
export {
  apiDepsFromEnv,
  fixesFromDisk,
  MAX_RUNNER_OUTPUT_BYTES,
  readAuditView,
  runDepsFromEnv,
  runnerOutputPath,
  runnerOutputSchema,
  selfOrigin,
  supabaseAuditStore,
} from './supabase.js';
export {
  auditIdSchema,
  type CreateAuditInput,
  createAuditInput,
  InvalidSiteUrl,
  LAB_SUFFIX,
  normalizeSiteUrl,
  type SiteInput,
  targetOf,
} from './target.js';
export {
  createTrigger,
  RUN_FUNCTION_PATH,
  signTrigger,
  TRIGGER_HEADER,
  verifyTrigger,
} from './trigger.js';
