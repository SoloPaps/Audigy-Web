import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const csp =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321; base-uri 'self'; form-action 'self'";

describe('politique locale', () => {
  it('laisse Firefox hydrater les îlots Astro', async () => {
    const toml = await readFile('netlify.toml', 'utf8');
    expect(toml).toContain(`Content-Security-Policy = "${csp}"`);
    expect(toml).toContain('X-Frame-Options = "DENY"');
    expect(toml).toContain('X-Content-Type-Options = "nosniff"');
    expect(toml).toContain(
      'Referrer-Policy = "strict-origin-when-cross-origin"',
    );
    expect(toml).toContain(
      'Permissions-Policy = "camera=(), microphone=(), geolocation=()"',
    );
  });

  it('autorise localhost et 127.0.0.1 pour le retour magique', async () => {
    const toml = await readFile('supabase/config.toml', 'utf8');
    for (const origin of [
      'http://127.0.0.1:8888',
      'http://localhost:8888',
      'http://127.0.0.1:4321',
      'http://localhost:4321',
    ]) {
      expect(toml).toContain(`"${origin}"`);
    }
  });
});
