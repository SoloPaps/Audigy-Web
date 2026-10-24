import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildFunctions } from './build-functions.js';

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
    config?: { path: string; method: string };
  };
}

describe('fonctions Netlify', () => {
  it('routes publiques et fonctions de fond sans route', async () => {
    expect(names.sort()).toEqual([
      'api-audits-create',
      'api-audits-get',
      'api-verifications-check',
      'api-verifications-create',
      'audit-run-background',
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
