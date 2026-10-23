import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NetError } from './errors.js';
import { blockedReason, parseIpv4Loose } from './ip.js';

/** Résout un nom d'hôte en adresses IP (A et AAAA). */
export type Resolve = (hostname: string) => Promise<string[]>;

/**
 * Réservé aux tests : redirige la connexion vers une autre adresse APRÈS validation
 * de l'IP épinglée (ex. serveur local). Ne doit jamais être fourni en production.
 */
export type Dial = (ip: string, port: number) => { host: string; port: number };

export const systemResolve: Resolve = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map(
    (entry) => entry.address,
  );

export const directDial: Dial = (ip, port) => ({ host: ip, port });

/** Nom d'hôte normalisé et, s'il s'agit d'une IP littérale (toutes notations), sa forme canonique. */
export function normalizeHost(hostname: string): {
  host: string;
  literalIp: string | null;
} {
  const bare =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
  const host = bare.toLowerCase().replace(/\.$/, '');
  if (host === '') throw new NetError('INVALID_URL', 'Hôte vide');
  if (isIP(host)) return { host, literalIp: host };
  const loose = parseIpv4Loose(host);
  if (loose) return { host, literalIp: loose };
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new NetError('BLOCKED_ADDRESS', 'Hôte local refusé');
  }
  return { host, literalIp: null };
}

export function assertPublic(ip: string): void {
  const reason = blockedReason(ip);
  if (reason)
    throw new NetError('BLOCKED_ADDRESS', `Adresse refusée (${reason})`);
}

/**
 * Renvoie l'IP à utiliser pour `hostname`. La première résolution est validée puis
 * épinglée dans `pins` : les résolutions suivantes (DNS rebinding) ne sont jamais consultées.
 * Toutes les adresses renvoyées doivent être publiques, sinon refus.
 */
export async function pinAddress(
  hostname: string,
  resolve: Resolve,
  pins: Map<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const { host, literalIp } = normalizeHost(hostname);
  if (literalIp) {
    assertPublic(literalIp);
    return literalIp;
  }
  const pinned = pins.get(host);
  if (pinned) return pinned;
  let addresses: string[];
  try {
    addresses = await abortable(resolve(host), signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new NetError('DNS_FAILURE', 'Résolution DNS impossible', {
      cause: error,
    });
  }
  const valid = addresses.filter((a) => isIP(a) !== 0);
  if (valid.length === 0)
    throw new NetError('DNS_FAILURE', 'Aucune adresse IP');
  for (const address of valid) assertPublic(address);
  const chosen = valid[0] as string;
  pins.set(host, chosen);
  return chosen;
}

export function abortable<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}
