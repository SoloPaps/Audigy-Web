/** Clé anon et URL, publiques par conception (PLAN §9). Jamais la clé service. */
export function publicConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  return {
    supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

export function authConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = publicConfig();
  return supabaseUrl !== '' && supabaseAnonKey !== '';
}
