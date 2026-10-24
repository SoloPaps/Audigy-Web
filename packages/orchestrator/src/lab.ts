import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RunContext } from '@audigy/engine';
import {
  createSafeFetch,
  createTlsProbe,
  type Dial,
  type DohResolver,
  type ExternalApi,
  NetError,
  type RequestBudget,
  type Resolve,
} from '@audigy/net';
import { z } from 'zod';
import { LAB_SUFFIX } from './target.js';

/**
 * Labo local : sites de `fixtures/sites` servis sur 127.0.0.1 sous des noms
 * `<site>.audigy.test`. Le réseau reste celui de `@audigy/net` (anti-SSRF, IP épinglée) :
 * seule la connexion finale est redirigée, comme dans les tests. Tout autre nom,
 * le DNS public et les API tierces sont refusés : le labo ne sort jamais.
 */
export const labConfigSchema = z.strictObject({
  version: z.literal(1),
  ca: z.string().includes('BEGIN CERTIFICATE'),
  hosts: z.record(
    z.string().endsWith(LAB_SUFFIX),
    z.strictObject({
      http: z.number().int().min(1).max(65_535),
      https: z.number().int().min(1).max(65_535),
    }),
  ),
});

export type LabConfig = z.infer<typeof labConfigSchema>;

/** Variable de dev (hors §9) : chemin du fichier écrit par `pnpm lab`. */
export const LAB_ENV_NAME = 'AUDIGY_LAB';

/**
 * Lit la config du labo. Fonctions : seulement sous `netlify dev` (`NETLIFY_DEV=true`).
 * CLI : `requireNetlifyDev: false` (outil local).
 */
export function labFromEnv(
  env: NodeJS.ProcessEnv,
  options: { requireNetlifyDev: boolean; cwd?: string },
): LabConfig | null {
  const file = env[LAB_ENV_NAME]?.trim();
  if (!file) return null;
  if (options.requireNetlifyDev && env.NETLIFY_DEV !== 'true') return null;
  const full = path.resolve(options.cwd ?? process.cwd(), file);
  return labConfigSchema.parse(JSON.parse(readFileSync(full, 'utf8')));
}

/** Adresses publiques fictives, jamais contactées : `dial` les remplace par 127.0.0.1. */
const FAKE_BASE = [93, 184, 216];

function labHosts(lab: LabConfig): string[] {
  return Object.keys(lab.hosts).sort();
}

const offline = (what: string) =>
  new NetError('DNS_FAILURE', `${what} indisponible dans le labo`);

export const labDns: DohResolver = {
  query: () => Promise.reject(offline('DNS')),
  addresses: () => Promise.reject(offline('DNS')),
};

export const labApi: ExternalApi = {
  request: () => Promise.reject(offline('API tierce')),
};

export function labNet(
  lab: LabConfig,
  budget: RequestBudget,
): Pick<RunContext['net'], 'fetch' | 'tls' | 'dns' | 'api'> {
  const hosts = labHosts(lab);
  const ipOf = new Map(
    hosts.map((host, i) => [host, `${FAKE_BASE.join('.')}.${10 + i}`]),
  );
  const hostOf = new Map([...ipOf].map(([host, ip]) => [ip, host]));
  const resolve: Resolve = async (hostname) => {
    const ip = ipOf.get(hostname.toLowerCase().replace(/\.$/, ''));
    if (!ip) throw offline('Nom hors labo');
    return [ip];
  };
  const dial: Dial = (ip, port) => {
    const host = hostOf.get(ip);
    const ports = host ? lab.hosts[host] : undefined;
    if (!ports) throw offline('Adresse hors labo');
    return { host: '127.0.0.1', port: port === 443 ? ports.https : ports.http };
  };
  return {
    fetch: createSafeFetch({ resolve, dial, ca: [lab.ca], budget }),
    tls: createTlsProbe({ resolve, dial, ca: [lab.ca] }),
    dns: labDns,
    api: labApi,
  };
}
