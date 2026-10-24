import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assignMissing,
  commandOptions,
  loadRootEnv,
  parseEnv,
  syncWebEnv,
  webPublicEnvFile,
} from './dev-env.mjs';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'audigy-env-'));
  roots.push(root);
  return root;
}

describe('environnement local du build', () => {
  it('lit un .env sans écraser les variables déjà définies', async () => {
    const root = await tempRoot();
    await writeFile(
      path.join(root, '.env'),
      [
        '# local seulement',
        'export SUPABASE_URL="http://127.0.0.1:54321"',
        "SUPABASE_ANON_KEY='anon-local-test'",
        'SUPABASE_SERVICE_ROLE_KEY=role-local-secret',
        '',
      ].join('\n'),
    );
    const env: NodeJS.ProcessEnv = { SUPABASE_URL: 'http://127.0.0.1:9' };
    await loadRootEnv(root, env);
    expect(env.SUPABASE_URL).toBe('http://127.0.0.1:9');
    expect(env.SUPABASE_ANON_KEY).toBe('anon-local-test');
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('role-local-secret');
  });

  it('ignore un .env absent', async () => {
    const env: NodeJS.ProcessEnv = {};
    await loadRootEnv(await tempRoot(), env);
    expect(env.SUPABASE_URL).toBeUndefined();
  });

  it('n’ajoute une clé que si elle est absente', () => {
    const env: NodeJS.ProcessEnv = { SUPABASE_URL: '' };
    assignMissing(env, parseEnv('SUPABASE_URL=http://127.0.0.1:54321'));
    expect(env.SUPABASE_URL).toBe('');
    expect(parseEnv('SUPABASE_ANON_KEY=abc=def')).toEqual({
      SUPABASE_ANON_KEY: 'abc=def',
    });
  });

  it('écrit apps/web/.env avec les clés publiques seulement', async () => {
    const root = await tempRoot();
    await writeFile(
      path.join(root, '.env'),
      [
        'SUPABASE_URL=http://127.0.0.1:54321',
        'SUPABASE_ANON_KEY=anon-local-test',
        'SUPABASE_SERVICE_ROLE_KEY=role-local-secret',
        'BREVO_API_KEY=brevo-secret',
        '',
      ].join('\n'),
    );
    expect(await syncWebEnv(root)).toBe(true);
    const dest = path.join(root, 'apps', 'web', '.env');
    const body = await readFile(dest, 'utf8');
    expect(body).toBe(
      webPublicEnvFile({
        SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_ANON_KEY: 'anon-local-test',
        SUPABASE_SERVICE_ROLE_KEY: 'role-local-secret',
      }),
    );
    expect(body).not.toContain('role-local-secret');
    expect(body).not.toContain('brevo-secret');
    expect(body).not.toContain('SERVICE');
    const mode = (await stat(dest)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('n’écrit pas apps/web/.env sans les deux clés publiques', async () => {
    const root = await tempRoot();
    await writeFile(
      path.join(root, '.env'),
      'SUPABASE_URL=http://127.0.0.1:54321\n',
    );
    expect(await syncWebEnv(root)).toBe(false);
    expect(
      webPublicEnvFile({
        SUPABASE_URL: 'http://127.0.0.1:54321\nX',
        SUPABASE_ANON_KEY: 'anon-local-test',
      }),
    ).toBe(null);
  });

  it('active le shell seulement sous Windows', () => {
    const win = commandOptions(
      { SUPABASE_URL: 'http://127.0.0.1:54321' },
      'win32',
    );
    expect(win.shell).toBe(true);
    expect(win.stdio).toBe('inherit');
    expect(win.env).toMatchObject({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      ASTRO_TELEMETRY_DISABLED: '1',
    });
    expect(commandOptions({}, 'linux').shell).toBe(false);
  });
});
