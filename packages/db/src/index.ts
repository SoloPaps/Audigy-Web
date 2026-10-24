/**
 * @audigy/db — client typé et accès Postgres (PLAN §8, §9).
 *
 * API
 * - `createUserClient({ url, anonKey, persistSession? })` : clé anon, RLS.
 *   `persistSession` seulement dans le navigateur (lien magique).
 * - `createServiceClient({ url, serviceRoleKey })` : fonctions et runner.
 *   Jamais dans le navigateur.
 * - `requestMagicLink(client, { email, redirectTo })` : connexion par e-mail,
 *   sans mot de passe. `{ ok: false }` ne contient pas le message du fournisseur.
 * - `claimNextAudit(client)` : RPC `claim_next_audit` (service_role).
 * - `requestAudit(client, input)` : RPC `request_audit` (service_role). Un audit du même
 *   site et du même mode depuis moins de 15 min est renvoyé tel quel (double clic).
 *   Limites : 10 par jour (Europe/Paris) et par utilisateur, 1 par hôte et 15 min.
 * - `writeAuditResults(client, input)` : RPC `write_audit_results` (service_role).
 * - `failStaleAudits(client, minutes)` : audits `running`/`partial` trop vieux → `failed`.
 * - `createUserClient({ …, accessToken })` : client au nom de l'utilisateur (fonctions).
 * - `readReportByShareToken(client, token)` : rapport `link` non révoqué.
 * - `dbEnvFrom(env)` : exige `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 *   `SUPABASE_SERVICE_ROLE_KEY`. Aucune valeur dans le dépôt.
 */
export {
  type AuditResultsInput,
  claimNextAudit,
  createServiceClient,
  createUserClient,
  type DbEnv,
  type DomainScoreRow,
  dbEnvFrom,
  type FindingRow,
  failStaleAudits,
  type MagicLinkClient,
  type RequestAuditInput,
  type RequestAuditOutcome,
  type RequestAuditResult,
  readReportByShareToken,
  requestAudit,
  requestMagicLink,
  type UserClientOptions,
  writeAuditResults,
} from './client.js';
export type { Database, Json } from './database.types.js';
export {
  ARTIFACT_KINDS,
  type ArtifactKind,
  AUDIT_MODES,
  AUDIT_STATUSES,
  AUDIT_TRIGGERS,
  type AuditMode,
  type AuditStatus,
  type AuditTrigger,
  DOMAINS,
  type Domain,
  FINDING_STATUSES,
  type FindingStatus,
  HOSTINGS,
  type Hosting,
  REPORT_VISIBILITIES,
  type ReportVisibility,
  SCORE_LEVELS,
  type ScoreLevel,
  SITE_SCOPES,
  type SiteScope,
  VERIFICATION_METHODS,
  VERIFICATION_STATUSES,
  type VerificationMethod,
  type VerificationStatus,
} from './types.js';
