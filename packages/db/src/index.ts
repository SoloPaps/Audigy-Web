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
 * - `readReportByShareToken(client, token)` : rapport `link` non révoqué.
 * - `dbEnvFrom(env)` : exige `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 *   `SUPABASE_SERVICE_ROLE_KEY`. Aucune valeur dans le dépôt.
 */
export {
  claimNextAudit,
  createServiceClient,
  createUserClient,
  type DbEnv,
  dbEnvFrom,
  type MagicLinkClient,
  readReportByShareToken,
  requestMagicLink,
  type UserClientOptions,
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
