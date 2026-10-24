import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { COMMON_HEADERS } from './publish-policy.js';

describe('politique locale', () => {
  it('pose les en-têtes communs et laisse la CSP au build', async () => {
    const toml = await readFile('netlify.toml', 'utf8');
    expect(toml).not.toContain('unsafe-inline');
    expect(toml).not.toContain('Content-Security-Policy');
    for (const [name, value] of Object.entries(COMMON_HEADERS)) {
      expect(toml).toContain(`${name} = "${value}"`);
    }
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
