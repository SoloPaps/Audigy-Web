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
 * - `handleCreateVerification`, `handleCheckVerification` : `POST /api/verifications`
 *   et `POST /api/verifications/check`. Le client ne peut pas se marquer vérifié.
 * - `handleRecheck` : relecture quotidienne signée (`verification-recheck-background`).
 *   Elle n’est pas dans le cron.
 *   Pas de planification dans `netlify.toml` (PART-22).
 * - `handleSchedule` : `schedule-tick` (cron 15 min, ≤ 30 s). Sonde HEAD, file
 *   les audits dus, alertes, agrège `uptime_daily` et purge le brut de 30 jours.
 * - `handleDigest` : `digest-weekly`, lundi 8 h Paris (cron 6 h et 7 h UTC).
 * - `handleUnsubscribe` : désabonnement en un clic (`List-Unsubscribe`).
 * - `handleOauthStart`, `handleOauthCallback`, `handleOauthRevoke` : OAuth Google
 *   (PKCE, `state`, accès hors ligne). Le jeton est chiffré (AES-256-GCM) et
 *   n’est jamais renvoyé. La révocation supprime la ligne.
 * - `decideRecheck`, `confirmClaimedAudit` : refus si la preuve a plus de 10 min,
 *   si la portée ne correspond pas, ou si elle a disparu (`expired` + alerte).
 * - `processNextAudit(deps)` : claim → checks côté fonction → `partial` → runner
 *   navigateur (GitHub `browser-audit.yml`) → attente ≤ 10 min → fusion → `done`.
 *   Le runner (`@audigy/browser-runner`, `runJob`) dépose `<id>/browser/results.json`
 *   dans le seau `artifacts` ; relu, vérifié (sha256, taille, schéma) puis rangé dans
 *   `ctx.shared` (`browser`) pour les checks `needs: ['browser']` (vie privée).
 *   Runner absent : checks navigateur `untested`, raison `reason.runner_absent`.
 * - `createAuditContext`, `defaultChecks` : réseau `@audigy/net` réel, ou labo local.
 * - `normalizeSiteUrl` : adresse saisie → site (`https`, portée, hébergeur).
 * - `createLogger`, `redact` : journal JSON sans secret ni donnée personnelle.
 * - `handleAccount` : export JSON, acceptation versionnée des CGU, suppression
 *   du compte (données et artefacts). Export et CGU : 30 par heure. Suppression :
 *   5 par jour. Au-delà : 429. `TERMS_VERSION` vient de `@audigy/db`.
 * - `handlePlaces` : recherche et confirmation d’un lieu (Places API New).
 *   Sans `PLACES_API_KEY`, `GET` répond `{ enabled: false }` et aucun appel ne part.
 *   Le navigateur ne parle qu’à `/api/places`. Cache 7 jours en base.
 * - `apiDepsFromEnv`, `runDepsFromEnv` : dépendances depuis les noms du §9.
 * - Labo (`AUDIGY_LAB`, dev seulement) : `labFromEnv`, `labNet`. Noms `*.audigy.test`.
 *   `AUDIGY_LOCAL_RUNNER=true` (labo sous `netlify dev`) : pas d'appel GitHub, la
 *   fonction attend le runner lancé en local (`pnpm lab:audit --browser`).
 */
export {
  type AccountAction,
  type AccountDeps,
  type AccountExport,
  type AccountGateway,
  accountLimit,
  accountRetryAfter,
  accountWindowStart,
  deleteAccount,
  handleAccount,
  mergeArtifactPaths,
  OAUTH_EXPORT_FIELDS,
} from './account.js';
export { accountDepsFromEnv } from './account-db.js';
export {
  type AuditContext,
  type AuditContextOptions,
  createAuditContext,
  defaultChecks,
} from './context.js';
export { type CreateDeps, type CreateResult, createAudit } from './create.js';
export {
  type AuditEvent,
  activeCheckEvent,
  applyProbe,
  checkEvent,
  createEvent,
  decideRecheck,
  type ProbeApply,
  type RecheckDecision,
} from './decide.js';
export {
  BROWSER_WORKFLOW,
  createGithubDispatcher,
  createLocalDispatcher,
  type Dispatcher,
  type DispatchResult,
  LOCAL_RUNNER_ENV_NAME,
} from './dispatch.js';
export { gscForAudit, loadSearchConsole } from './gsc-port.js';
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
export { handleUnsubscribe, type UnsubscribeDeps } from './mail.js';
export {
  handleOauthCallback,
  handleOauthRevoke,
  handleOauthStart,
  type OauthDeps,
  type OauthTokenRows,
  oauthDepsFromEnv,
} from './oauth-google.js';
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
  handlePlaces,
  type PlacesDeps,
  type PlaceView,
  placesDepsFromEnv,
  readConfirmedPlaceId,
  supabasePlacesCache,
  takePlacesSlot,
} from './places.js';
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
  type DigestDeps,
  handleDigest,
  handleSchedule,
  isMondayEightParis,
  type ScheduleDeps,
  type TickResult,
} from './schedule.js';
export {
  digestDepsFromEnv,
  parseDigest,
  parseRoster,
  scheduleDepsFromEnv,
  unsubscribeDepsFromEnv,
} from './schedule-db.js';
export {
  apiDepsFromEnv,
  fixesFromDisk,
  MAX_RUNNER_OUTPUT_BYTES,
  readAuditView,
  runDepsFromEnv,
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
  bufferToBytea,
  byteaToBuffer,
  createOauthCrypto,
  parseTokenKey,
} from './token-box.js';
export {
  createTrigger,
  RUN_FUNCTION_PATH,
  signTrigger,
  TRIGGER_HEADER,
  verifyTrigger,
} from './trigger.js';
export {
  appendAuditLog,
  claimedOwnership,
  confirmClaimedAudit,
  recheckDepsFromEnv,
  recheckDueVerifications,
  recheckNet,
  verificationDepsFromEnv,
} from './verify-db.js';
export {
  handleCheckVerification,
  handleCreateVerification,
  handleRecheck,
  type OwnedSite,
  type OwnedVerification,
  type RecheckDeps,
  type VerificationDeps,
  type VerificationPatch,
} from './verify-http.js';
