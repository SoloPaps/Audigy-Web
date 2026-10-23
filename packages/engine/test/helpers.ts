import {
  createRequestBudget,
  createSafeFetch,
  type DohResolver,
  type TlsProbe,
} from '@audigy/net';
import {
  type Check,
  type CheckResult,
  createSharedArtifacts,
  type Domain,
  type RunContext,
} from '../src/index.js';

const PUBLIC_IP = '93.184.216.34';
export const FIXED_NOW = new Date('2026-10-23T12:00:00.000Z');

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};
const noTls: TlsProbe = () =>
  Promise.reject(new Error('TLS non disponible en test'));

/** Contexte hors ligne : `safeFetch` réel, connexion redirigée vers le serveur local. */
export function makeContext(
  options: { verified?: boolean; port?: number; url?: string } = {},
): RunContext {
  const budget = createRequestBudget({ perHostIntervalMs: 0 });
  const port = options.port ?? 9;
  return {
    target: {
      url: new URL(options.url ?? 'http://site.test/'),
      scope: 'origin',
      hosting: 'netlify',
    },
    verified: options.verified ?? false,
    net: {
      fetch: createSafeFetch({
        resolve: async () => [PUBLIC_IP],
        dial: () => ({ host: '127.0.0.1', port }),
        budget,
        timeoutMs: 2000,
      }),
      dns: noDns,
      tls: noTls,
    },
    shared: createSharedArtifacts(),
    budget,
    now: () => FIXED_NOW,
  };
}

export function result(
  status: CheckResult['status'],
  extra: Partial<CheckResult> = {},
): CheckResult {
  return {
    status,
    severity: 2,
    impact: 2,
    messageKey: `test.${status}`,
    ...(status === 'untested' || status === 'na' ? { reason: 'test.na' } : {}),
    ...extra,
  };
}

export function fakeCheck(
  id: string,
  run: Check['run'] | CheckResult,
  extra: Partial<Check> = {},
): Check {
  return {
    id,
    domain: id.split('.')[0] as Domain,
    mode: 'passive',
    needs: [],
    weight: 1,
    run: typeof run === 'function' ? run : async () => run,
    ...extra,
  };
}
