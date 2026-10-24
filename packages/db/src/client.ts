import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types.js';

type AuditRow =
  Database['public']['Functions']['claim_next_audit']['Returns'][number];
type SharedReportRow =
  Database['public']['Functions']['read_report_by_share_token']['Returns'][number];
type PublicScoreRow =
  Database['public']['Functions']['read_public_score']['Returns'][number];

export interface DbEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

const ENV_NAMES = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/** Lit les noms du §9. Aucune valeur par défaut. */
export function dbEnvFrom(env: NodeJS.ProcessEnv): DbEnv {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(`${ENV_NAMES.join(', ')} sont requis`);
  }
  return { url, anonKey, serviceRoleKey };
}

export interface UserClientOptions {
  url: string;
  anonKey: string;
  /** Session navigateur. Désactivé pour les tests et les fonctions. */
  persistSession?: boolean;
  /** Jeton d'accès de l'utilisateur (fonctions) : requêtes faites en son nom, sous RLS. */
  accessToken?: string;
}

/** Client navigateur : clé anon, lectures soumises au RLS. */
export function createUserClient(
  options: UserClientOptions,
): SupabaseClient<Database> {
  const persist = options.persistSession ?? false;
  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      persistSession: persist,
      autoRefreshToken: persist,
      detectSessionInUrl: persist,
    },
    ...(options.accessToken
      ? {
          global: {
            headers: { Authorization: `Bearer ${options.accessToken}` },
          },
        }
      : {}),
  });
}

/** Client des fonctions et du runner. Ne pas l'exposer au navigateur. */
export function createServiceClient(options: {
  url: string;
  serviceRoleKey: string;
}): SupabaseClient<Database> {
  return createClient<Database>(options.url, options.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export interface MagicLinkClient {
  auth: {
    signInWithOtp(credentials: {
      email: string;
      options?: { emailRedirectTo?: string; shouldCreateUser?: boolean };
    }): Promise<{ error: { message: string } | null }>;
  };
}

/** Lien magique par e-mail. Pas de mot de passe. Le message du fournisseur n'est pas renvoyé. */
export async function requestMagicLink(
  client: MagicLinkClient,
  input: { email: string; redirectTo: string },
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await client.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: input.redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) return { ok: false };
  return { ok: true };
}

export async function claimNextAudit(
  client: SupabaseClient<Database>,
): Promise<AuditRow | null> {
  const { data, error } = await client.rpc('claim_next_audit');
  if (error) throw new Error('claim_failed');
  return data?.[0] ?? null;
}

export async function readReportByShareToken(
  client: SupabaseClient<Database>,
  token: string,
): Promise<SharedReportRow | null> {
  const { data, error } = await client.rpc('read_report_by_share_token', {
    p_token: token,
  });
  if (error) throw new Error('report_lookup_failed');
  return data?.[0] ?? null;
}

const PUBLIC_SLUG = /^[a-z0-9-]{8,64}$/;
const SHARE_TOKEN = /^[0-9a-f]{32}$/;

/** Score public d'un site opt-in. `null` si le slug est absent ou retiré. */
export async function readPublicScore(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<PublicScoreRow | null> {
  if (!PUBLIC_SLUG.test(slug)) return null;
  const { data, error } = await client.rpc('read_public_score', {
    p_slug: slug,
  });
  if (error) throw new Error('public_score_failed');
  return data?.[0] ?? null;
}

/**
 * Score d'un lien `link` encore ouvert.
 * Révoqué (`revoked_at` renseigné) : `null` dès la lecture suivante.
 */
export async function readSharedScore(
  client: SupabaseClient<Database>,
  token: string,
): Promise<PublicScoreRow | null> {
  if (!SHARE_TOKEN.test(token)) return null;
  const { data, error } = await client.rpc('read_shared_score', {
    p_token: token,
  });
  if (error) throw new Error('shared_score_failed');
  return data?.[0] ?? null;
}

export type RequestAuditOutcome =
  | 'created'
  | 'existing'
  | 'site_not_found'
  | 'host_limit'
  | 'user_limit'
  | 'unverified';

export interface RequestAuditInput {
  userId: string;
  siteId: string;
  mode: 'passive' | 'active';
  trigger: 'manual' | 'schedule';
  methodVersion: string;
  engineVersion: string;
}

export interface RequestAuditResult {
  outcome: RequestAuditOutcome;
  auditId: string | null;
  retryAfterSeconds: number | null;
}

const REQUEST_OUTCOMES: ReadonlySet<string> = new Set<RequestAuditOutcome>([
  'created',
  'existing',
  'site_not_found',
  'host_limit',
  'user_limit',
  'unverified',
]);

/** RPC `request_audit` (service_role) : création atomique, double clic et limites. */
export async function requestAudit(
  client: SupabaseClient<Database>,
  input: RequestAuditInput,
): Promise<RequestAuditResult> {
  const { data, error } = await client.rpc('request_audit', {
    p_user_id: input.userId,
    p_site_id: input.siteId,
    p_mode: input.mode,
    p_trigger: input.trigger,
    p_method_version: input.methodVersion,
    p_engine_version: input.engineVersion,
  });
  if (error) throw new Error('request_audit_failed');
  const row = data?.[0];
  if (!row || !REQUEST_OUTCOMES.has(row.outcome))
    throw new Error('request_audit_failed');
  return {
    outcome: row.outcome as RequestAuditOutcome,
    auditId: row.audit_id ?? null,
    retryAfterSeconds: row.retry_after_seconds ?? null,
  };
}

export interface FindingRow {
  domain: string;
  check_id: string;
  status: string;
  severity: number;
  impact: number;
  score: number | null;
  measured: Json;
  message_key: string;
  params: Json;
  fix_key: string | null;
  effort_minutes: number | null;
  reason: string | null;
}

export interface DomainScoreRow {
  domain: string;
  score: number | null;
  coverage: number;
  level: string;
}

export interface AuditResultsInput {
  auditId: string;
  status: 'partial' | 'done' | 'failed';
  globalScore: number | null;
  coverage: number | null;
  domainScores: DomainScoreRow[];
  findings: FindingRow[];
  error: string | null;
}

/** RPC `write_audit_results` (service_role) : remplace constats et scores en une transaction. */
export async function writeAuditResults(
  client: SupabaseClient<Database>,
  input: AuditResultsInput,
): Promise<void> {
  const { error } = await client.rpc('write_audit_results', {
    p_audit_id: input.auditId,
    p_status: input.status,
    // Les RPC acceptent null ; les types générés ne le disent pas.
    p_global_score: input.globalScore as number,
    p_coverage: input.coverage as number,
    p_domain_scores: input.domainScores as unknown as Json,
    p_findings: input.findings as unknown as Json,
    p_error: input.error as string,
  });
  if (error) throw new Error('write_audit_results_failed');
}

/** RPC `fail_stale_audits` (service_role) : audits restés en cours trop longtemps. */
export async function failStaleAudits(
  client: SupabaseClient<Database>,
  olderThanMinutes: number,
): Promise<number> {
  const { data, error } = await client.rpc('fail_stale_audits', {
    p_older_than: `${Math.max(1, Math.round(olderThanMinutes))} minutes`,
  });
  if (error) throw new Error('fail_stale_audits_failed');
  return data ?? 0;
}
