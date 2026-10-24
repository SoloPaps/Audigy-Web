import { execFileSync } from 'node:child_process';
import { open, rm, stat } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Racine du dépôt (packages/db/test → ../../..). */
export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

export interface LocalSupabase {
  apiUrl: string;
  dbUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  mailpitUrl: string;
}

const cliEnv = { ...process.env };
delete cliEnv.SUPABASE_ACCESS_TOKEN;
delete cliEnv.SUPABASE_INTERNAL_ACCESS_TOKEN;
delete cliEnv.SUPABASE_URL;
delete cliEnv.SUPABASE_ANON_KEY;
delete cliEnv.SUPABASE_SERVICE_ROLE_KEY;

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function redact(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jeton]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[jeton]')
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/gi, '$1[mot]@');
}

/** Uniquement le stack local. Pas de projet distant. */
function supabase(args: string[]): string {
  const result = execFileSync('supabase', args, {
    cwd: repoRoot,
    env: cliEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result;
}

function runSupabase(args: string[]): void {
  try {
    execFileSync('supabase', args, {
      cwd: repoRoot,
      env: cliEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const detail = redact(`${err.stderr ?? ''}\n${err.stdout ?? ''}`).trim();
    throw new Error(`supabase ${args.join(' ')} a échoué\n${detail}`);
  }
}

export async function ensureLocalSupabase(): Promise<void> {
  if (await portOpen(54321)) return;
  runSupabase([
    'start',
    '--yes',
    '-x',
    'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ]);
}

const LOCK_FILE = path.join(tmpdir(), 'audigy-supabase-test.lock');
const LOCK_STALE_MS = 15 * 60_000;

/**
 * Verrou entre fichiers de test (Vitest les lance en parallèle) : un test qui
 * réinitialise la base ne doit pas tourner pendant un autre qui l'utilise.
 */
export async function lockLocalDatabase(): Promise<() => Promise<void>> {
  for (;;) {
    try {
      const handle = await open(LOCK_FILE, 'wx');
      await handle.writeFile(String(process.pid));
      await handle.close();
      return () => rm(LOCK_FILE, { force: true });
    } catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') throw error;
      const info = await stat(LOCK_FILE).catch(() => null);
      if (info && Date.now() - info.mtimeMs > LOCK_STALE_MS) {
        await rm(LOCK_FILE, { force: true });
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

/** Rejoue les migrations sur une base vide (drop + apply + seed). */
export function resetLocalDatabase(): void {
  runSupabase(['db', 'reset', '--local', '--yes']);
}

export function localSupabaseStatus(): LocalSupabase {
  const raw = supabase(['status', '-o', 'env']);
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (match?.[1] && match[2] !== undefined) env[match[1]] = match[2];
  }
  const apiUrl = env.API_URL;
  const dbUrl = env.DB_URL;
  const anonKey = env.ANON_KEY;
  const serviceRoleKey = env.SERVICE_ROLE_KEY;
  const mailpitUrl = env.MAILPIT_URL;
  if (!apiUrl || !dbUrl || !anonKey || !serviceRoleKey || !mailpitUrl) {
    throw new Error('supabase status incomplet');
  }
  return { apiUrl, dbUrl, anonKey, serviceRoleKey, mailpitUrl };
}
