import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

type AuditRow =
  Database['public']['Functions']['claim_next_audit']['Returns'][number];
type SharedReportRow =
  Database['public']['Functions']['read_report_by_share_token']['Returns'][number];

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
