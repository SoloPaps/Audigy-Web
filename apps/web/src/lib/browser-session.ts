import type { Database } from '@audigy/db';
import { requestMagicLink } from '@audigy/db';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY } from './auth-storage.js';
import { authConfigured, publicConfig } from './public-config.js';

export { AUTH_STORAGE_KEY };

let client: SupabaseClient<Database> | null = null;

export function browserClient(): SupabaseClient<Database> | null {
  if (!authConfigured()) return null;
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = publicConfig();
  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: AUTH_STORAGE_KEY,
      flowType: 'pkce',
    },
  });
  return client;
}

export async function currentSession(): Promise<Session | null> {
  const supabase = browserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function sendMagicLink(
  email: string,
  redirectTo: string,
): Promise<{ ok: true } | { ok: false }> {
  const supabase = browserClient();
  if (!supabase) return { ok: false };
  return requestMagicLink(supabase, { email, redirectTo });
}

export async function signOut(): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
