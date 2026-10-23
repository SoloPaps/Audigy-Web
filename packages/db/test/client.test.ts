import { describe, expect, it } from 'vitest';
import { dbEnvFrom, requestMagicLink } from '../src/index.js';

describe('dbEnvFrom', () => {
  it('exige les trois noms du §9, sans valeur de repli', () => {
    expect(() => dbEnvFrom({})).toThrow(
      /SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(
      dbEnvFrom({
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_ANON_KEY: 'anon-locale',
        SUPABASE_SERVICE_ROLE_KEY: 'service-locale',
      }),
    ).toEqual({
      url: 'http://127.0.0.1:54321',
      anonKey: 'anon-locale',
      serviceRoleKey: 'service-locale',
    });
  });
});

describe('requestMagicLink', () => {
  it('envoie un lien magique, sans mot de passe', async () => {
    const calls: unknown[] = [];
    const result = await requestMagicLink(
      {
        auth: {
          signInWithOtp: async (credentials) => {
            calls.push(credentials);
            return { error: null };
          },
        },
      },
      { email: 'a@example.com', redirectTo: 'http://127.0.0.1:8888' },
    );
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        email: 'a@example.com',
        options: {
          emailRedirectTo: 'http://127.0.0.1:8888',
          shouldCreateUser: true,
        },
      },
    ]);
  });

  it('masque le message du fournisseur', async () => {
    const result = await requestMagicLink(
      {
        auth: {
          signInWithOtp: async () => ({
            error: { message: 'smtp secret leaked' },
          }),
        },
      },
      { email: 'a@example.com', redirectTo: 'http://127.0.0.1:8888' },
    );
    expect(result).toEqual({ ok: false });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
