import type { AuditResultsInput } from '@audigy/db';
import {
  BROWSER_SHARED_KEY,
  type Check,
  type CheckResult,
  createSharedArtifacts,
  type RunContext,
} from '@audigy/engine';
import {
  createRequestBudget,
  type DohResolver,
  NetError,
  type SafeFetch,
  type TlsProbe,
} from '@audigy/net';
import type {
  AuditContext,
  AuditStore,
  ClaimedAudit,
  Logger,
} from '../src/index.js';
import { createLogger } from '../src/index.js';

export const AUDIT_ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';
export const SITE_ID = '0d6c8a8e-2f8a-4c7e-9a52-0f7a1d2b3c4d';

const offline = () => Promise.reject(new NetError('DNS_FAILURE', 'hors ligne'));

/** Contexte sans réseau : tout appel sortant échoue. */
export function offlineContext(verified = false): AuditContext {
  const fetch = (() => offline()) as unknown as SafeFetch;
  const dns: DohResolver = { query: offline, addresses: offline };
  const tls: TlsProbe = () => offline();
  const ctx: RunContext = {
    target: {
      url: new URL('https://exemple.fr/'),
      scope: 'origin',
      hosting: 'other',
    },
    verified,
    net: { fetch, dns, tls },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0 }),
    now: () => new Date('2026-10-24T10:00:00.000Z'),
  };
  return { ctx, available: ['http', 'dns', 'tls'] };
}

function pass(extra: Partial<CheckResult> = {}): CheckResult {
  return {
    status: 'pass',
    severity: 2,
    impact: 2,
    messageKey: 'x.ok',
    ...extra,
  };
}

export const serverCheck: Check = {
  id: 'securite.fictif',
  domain: 'securite',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  run: async () => pass(),
};

export const failingCheck: Check = {
  id: 'seo.fictif',
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  run: async () => ({
    status: 'fail',
    severity: 3,
    impact: 3,
    messageKey: 'seo.fictif.fail',
    fixKey: 'seo.fictif',
  }),
};

/** Lit `contrast` dans la sortie du runner navigateur. */
export const browserCheck: Check = {
  id: 'accessibilite.fictif',
  domain: 'accessibilite',
  mode: 'passive',
  needs: ['http', 'browser'],
  weight: 2,
  run: async (ctx) => {
    const data = await ctx.shared.get<{ contrast?: boolean }>(
      BROWSER_SHARED_KEY,
      async () => ({}),
    );
    return data.contrast
      ? pass({ messageKey: 'accessibilite.fictif.ok' })
      : {
          status: 'fail',
          severity: 2,
          impact: 2,
          messageKey: 'accessibilite.fictif.fail',
        };
  },
};

export interface MemoryStore extends AuditStore {
  writes: AuditResultsInput[];
  queue: ClaimedAudit[];
  runnerOutput: unknown | null;
  verifiedFresh: boolean;
  staleCalls: number[];
}

export function memoryStore(audits: ClaimedAudit[] = []): MemoryStore {
  const store: MemoryStore = {
    writes: [],
    queue: [...audits],
    runnerOutput: null,
    verifiedFresh: false,
    staleCalls: [],
    async failStale(minutes) {
      store.staleCalls.push(minutes);
      return 0;
    },
    async claimNext() {
      return store.queue.shift() ?? null;
    },
    async isVerifiedFresh() {
      return store.verifiedFresh;
    },
    async writeResults(input) {
      store.writes.push(input);
    },
    async readRunnerOutput() {
      return store.runnerOutput;
    },
  };
  return store;
}

export function claimed(mode: 'passive' | 'active' = 'passive'): ClaimedAudit {
  return {
    id: AUDIT_ID,
    siteId: SITE_ID,
    mode,
    site: { url: 'https://exemple.fr', scope: 'origin', hosting: 'other' },
  };
}

export function captureLogger(secrets: string[] = []): {
  logger: Logger;
  lines: string[];
} {
  const lines: string[] = [];
  return {
    lines,
    logger: createLogger({ secrets, sink: (line) => lines.push(line) }),
  };
}
