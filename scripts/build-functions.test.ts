import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFunctions, TRACKERS_MODULE } from './build-functions.js';

type Handler = (req: Request, context?: unknown) => Promise<Response>;

let out: string;
let names: string[];
const saved = { ...process.env };

beforeAll(async () => {
  out = await mkdtemp(path.join(tmpdir(), 'audigy-functions-'));
  names = await buildFunctions(process.cwd(), out);
});

afterAll(async () => {
  process.env = saved;
  await rm(out, { recursive: true, force: true });
});

async function load(name: string) {
  return (await import(pathToFileURL(path.join(out, `${name}.mjs`)).href)) as {
    default: Handler;
    config?: { path?: string; method?: string; schedule?: string };
  };
}

describe('fonctions Netlify', () => {
  it('filtre trackers : chemin Windows et POSIX', () => {
    const posix = '/repo/packages/engine/checks/vie_privee/trackers.ts';
    const win = 'C:\\repo\\packages\\engine\\checks\\vie_privee\\trackers.ts';
    expect(TRACKERS_MODULE.test(posix)).toBe(true);
    expect(TRACKERS_MODULE.test(win)).toBe(true);
    expect(
      TRACKERS_MODULE.test(
        'C:\\repo\\packages\\engine\\checks\\vie_privee\\other.ts',
      ),
    ).toBe(false);
  });

  it('liste de traceurs inlinée : plus de lecture disque au runtime', async () => {
    const code = await readFile(
      path.join(out, 'api-audits-create.mjs'),
      'utf8',
    );
    expect(code).not.toContain('readFileSync(FILE');
  });

  it('routes publiques et fonctions de fond sans route', async () => {
    expect(names.sort()).toEqual([
      'api-audits-create',
      'api-audits-get',
      'api-unsubscribe',
      'api-verifications-check',
      'api-verifications-create',
      'audit-run-background',
      'digest-weekly',
      'oauth-google-callback',
      'oauth-google-revoke',
      'oauth-google-start',
      'schedule-tick',
      'verification-recheck-background',
    ]);
    expect((await load('api-audits-create')).config).toEqual({
      path: '/api/audits',
      method: 'POST',
    });
    expect((await load('api-audits-get')).config).toEqual({
      path: '/api/audits/:id',
      method: 'GET',
    });
    expect((await load('audit-run-background')).config).toBeUndefined();
    expect((await load('api-verifications-create')).config).toEqual({
      path: '/api/verifications',
      method: 'POST',
    });
    expect((await load('api-verifications-check')).config).toEqual({
      path: '/api/verifications/check',
      method: 'POST',
    });
    expect(
      (await load('verification-recheck-background')).config,
    ).toBeUndefined();
    expect((await load('api-unsubscribe')).config).toEqual({
      path: '/api/unsubscribe',
    });
    expect((await load('schedule-tick')).config).toEqual({
      schedule: '*/15 * * * *',
    });
    expect((await load('digest-weekly')).config).toEqual({
      schedule: '0 6,7 * * 1',
    });
    expect((await load('oauth-google-start')).config).toEqual({
      path: '/api/oauth/google/start',
      method: 'POST',
    });
    expect((await load('oauth-google-callback')).config).toEqual({
      path: '/api/oauth/google/callback',
      method: 'GET',
    });
    expect((await load('oauth-google-revoke')).config).toEqual({
      path: '/api/oauth/google/revoke',
      method: 'POST',
    });
  });

  it('bundle autonome : aucun import de paquet du monorepo', async () => {
    for (const name of names) {
      const code = await readFile(path.join(out, `${name}.mjs`), 'utf8');
      expect(code).not.toMatch(
        /^(?:import|export)\s[^;]*?from\s+["'](?!node:)/m,
      );
      expect(code).toMatch(/^import\s[^;]*?from\s+["']node:/m);
    }
  });

  it('sans configuration : 500 sans détail ; sans jeton : 401', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const create = (await load('api-audits-create')).default;
    const res = await create(
      new Request('http://localhost:8888/api/audits', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'internal',
      messageKey: 'api.error.internal',
    });

    process.env.SUPABASE_URL = 'http://127.0.0.1:9';
    process.env.SUPABASE_ANON_KEY = 'anon-cle-de-test-0123456789';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-cle-de-test-0123456789';
    const unauth = await create(
      new Request('http://localhost:8888/api/audits', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(unauth.status).toBe(401);
    const run = (await load('audit-run-background')).default;
    const refused = await run(
      new Request(
        'http://localhost:8888/.netlify/functions/audit-run-background',
        { method: 'POST' },
      ),
    );
    expect(refused.status).toBe(401);
  });
});
