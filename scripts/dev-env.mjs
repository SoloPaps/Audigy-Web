/**
 * `.env` local pour le build. N'écrase pas l'environnement déjà défini.
 * N'affiche aucune valeur. Ne écrit jamais la clé service dans apps/web.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isEnoent(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseEnv(text) {
  /** @type {Record<string, string>} */
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const body = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = body.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {Readonly<Record<string, string>>} parsed
 */
export function assignMissing(env, parsed) {
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] !== undefined) continue;
    env[key] = value;
  }
}

/**
 * @param {string} root
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function loadRootEnv(root, env = process.env) {
  let text;
  try {
    text = await readFile(path.join(root, '.env'), 'utf8');
  } catch (error) {
    if (isEnoent(error)) return;
    throw error;
  }
  assignMissing(env, parseEnv(text));
}

/**
 * URL et clé anon seulement. `null` si l'une manque ou contient un saut de ligne.
 * @param {Readonly<Record<string, string>>} parsed
 * @returns {string | null}
 */
export function webPublicEnvFile(parsed) {
  const url = parsed.SUPABASE_URL ?? '';
  const anon = parsed.SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) return null;
  if (/[\r\n]/.test(url) || /[\r\n]/.test(anon)) return null;
  return [
    '# Créé par pnpm lab. Supabase local, clés publiques seulement. Ignoré par git.',
    '# Ne pas commiter. Jamais la clé service.',
    `SUPABASE_URL=${url}`,
    `SUPABASE_ANON_KEY=${anon}`,
    '',
  ].join('\n');
}

/**
 * Recopie les clés publiques du `.env` racine vers `apps/web/.env`.
 * @param {string} root
 * @returns {Promise<boolean>}
 */
export async function syncWebEnv(root) {
  let text;
  try {
    text = await readFile(path.join(root, '.env'), 'utf8');
  } catch (error) {
    if (isEnoent(error)) return false;
    throw error;
  }
  const body = webPublicEnvFile(parseEnv(text));
  if (!body) return false;
  const dest = path.join(root, 'apps', 'web', '.env');
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, body, { mode: 0o600 });
  return true;
}

/**
 * `shell` seulement sous Windows : `pnpm` y est un `.cmd` (ENOENT sinon).
 * @param {NodeJS.ProcessEnv} [env]
 * @param {NodeJS.Platform} [platform]
 */
export function commandOptions(env = process.env, platform = process.platform) {
  return {
    stdio: /** @type {'inherit'} */ ('inherit'),
    env: { ...env, ASTRO_TELEMETRY_DISABLED: '1' },
    shell: platform === 'win32',
  };
}
