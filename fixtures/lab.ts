/**
 * Labo local : `fixtures/sites/<site>` servis sous `<site>.audigy.test`, en HTTP et en
 * HTTPS (AC de test générée au démarrage). Rien ne sort de 127.0.0.1.
 * `pnpm lab` écrit `.netlify/audigy-lab.json` puis reste ouvert. Avec
 * `AUDIGY_LAB=.netlify/audigy-lab.json`, `netlify dev` et la CLI auditent ces noms.
 * Si `.env` manque, il est créé avec les valeurs du Supabase local (jamais affichées).
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTestCerts } from '../packages/net/test/certs.js';
import {
  FIXTURE_SITES,
  type FixtureServer,
  type FixtureSite,
  startFixtureServer,
} from './server.js';

export const LAB_DOMAIN = 'audigy.test';
export const DEFAULT_LAB_FILE = '.netlify/audigy-lab.json';

export interface LabFile {
  version: 1;
  ca: string;
  hosts: Record<string, { http: number; https: number }>;
}

export interface Lab {
  config: LabFile;
  servers: Record<FixtureSite, { http: FixtureServer; https: FixtureServer }>;
  url(site: FixtureSite): string;
  close(): Promise<void>;
}

/** Le site « bon » redirige HTTP vers HTTPS ; « mauvais » sert aussi en clair. */
export async function startLab(): Promise<Lab> {
  const names = FIXTURE_SITES.map((site) => `${site}.${LAB_DOMAIN}`);
  const certs = generateTestCerts({ names, days: 90 });
  const servers = {} as Lab['servers'];
  const hosts: LabFile['hosts'] = {};
  for (const site of FIXTURE_SITES) {
    const host = `${site}.${LAB_DOMAIN}`;
    const secure = await startFixtureServer(site, 0, {
      tls: { key: certs.leafKey, cert: certs.leafCert },
    });
    const plain = await startFixtureServer(
      site,
      0,
      site === 'bon' ? { redirectTo: `https://${host}` } : {},
    );
    servers[site] = { http: plain, https: secure };
    hosts[host] = { http: plain.port, https: secure.port };
  }
  return {
    config: { version: 1, ca: certs.caCert, hosts },
    servers,
    url: (site) => `https://${site}.${LAB_DOMAIN}/`,
    async close() {
      for (const pair of Object.values(servers)) {
        await pair.http.close();
        await pair.https.close();
      }
    },
  };
}

async function ensureDevEnv(root: string, labFile: string): Promise<string> {
  const envPath = path.join(root, '.env');
  if (existsSync(envPath))
    return `.env existe : vérifiez AUDIGY_LAB=${labFile} et les clés SUPABASE_* locales.`;
  const { localSupabaseStatus } = await import('../packages/db/test/local.js');
  let local: ReturnType<typeof localSupabaseStatus>;
  try {
    local = localSupabaseStatus();
  } catch {
    return 'Supabase local absent : lancez « supabase start », puis relancez « pnpm lab ».';
  }
  const host = new URL(local.apiUrl).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost')
    return 'Supabase non local : .env non créé.';
  await writeFile(
    envPath,
    [
      '# Créé par pnpm lab. Valeurs du Supabase LOCAL uniquement. Ignoré par git.',
      `SUPABASE_URL=${local.apiUrl}`,
      `SUPABASE_ANON_KEY=${local.anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${local.serviceRoleKey}`,
      `AUDIGY_LAB=${labFile}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  return '.env créé avec les valeurs du Supabase local.';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const labFile = process.argv[2] ?? DEFAULT_LAB_FILE;
  const lab = await startLab();
  const full = path.resolve(root, labFile);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, `${JSON.stringify(lab.config, null, 2)}\n`);
  console.log(`Labo prêt : ${labFile}`);
  for (const site of FIXTURE_SITES) console.log(`- ${lab.url(site)}`);
  console.log(await ensureDevEnv(root, labFile));
  console.log('Laissez ce terminal ouvert. Ctrl+C pour arrêter.');
  const stop = async () => {
    await lab.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
