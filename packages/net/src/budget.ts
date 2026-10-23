import { NetError } from './errors.js';

export interface RequestBudget {
  /** Réserve une requête vers `host` ; attend pour respecter l'intervalle par hôte. */
  acquire(host: string): Promise<void>;
  /** Décompte des octets reçus ; lève `RESPONSE_TOO_LARGE` au-delà du plafond total. */
  consumeBytes(count: number): void;
  readonly requests: number;
  readonly bytes: number;
}

export interface RequestBudgetOptions {
  maxRequests?: number;
  perHostIntervalMs?: number;
  maxTotalBytes?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_MAX_REQUESTS = 50;
export const DEFAULT_PER_HOST_INTERVAL_MS = 1000;
export const DEFAULT_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createRequestBudget(
  options: RequestBudgetOptions = {},
): RequestBudget {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const interval = options.perHostIntervalMs ?? DEFAULT_PER_HOST_INTERVAL_MS;
  const maxBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const nextSlot = new Map<string, number>();
  let requests = 0;
  let bytes = 0;

  return {
    async acquire(host) {
      if (requests >= maxRequests) {
        throw new NetError(
          'BUDGET_EXCEEDED',
          `Budget de ${maxRequests} requêtes atteint`,
        );
      }
      requests++;
      const key = host.toLowerCase();
      const current = now();
      const slot = Math.max(current, nextSlot.get(key) ?? current);
      nextSlot.set(key, slot + interval);
      if (slot > current) await sleep(slot - current);
    },
    consumeBytes(count) {
      bytes += count;
      if (bytes > maxBytes) {
        throw new NetError(
          'RESPONSE_TOO_LARGE',
          `Plafond total de ${maxBytes} octets dépassé`,
        );
      }
    },
    get requests() {
      return requests;
    },
    get bytes() {
      return bytes;
    },
  };
}
