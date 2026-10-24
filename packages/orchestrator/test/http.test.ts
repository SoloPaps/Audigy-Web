import type { RequestAuditInput, RequestAuditResult } from '@audigy/db';
import { ENGINE_VERSION, METHOD_VERSION } from '@audigy/engine';
import { describe, expect, it, vi } from 'vitest';
import {
  type ApiDeps,
  type AuditView,
  type CreateDeps,
  handleCreate,
  handleGet,
  handleRun,
  type RunDeps,
  serve,
  signTrigger,
  TRIGGER_HEADER,
} from '../src/index.js';
import { AUDIT_ID, captureLogger, SITE_ID } from './helpers.js';

const TOKEN = 'jeton-utilisateur-0123456789abcdef';
const USER = '11111111-1111-4111-8111-111111111111';

function apiDeps(
  outcome: Partial<RequestAuditResult> = {},
  overrides: Partial<CreateDeps> = {},
) {
  const { logger, lines } = captureLogger([TOKEN]);
  const requests: RequestAuditInput[] = [];
  const trigger = vi.fn(async () => {});
  const ensureSite = vi.fn(async () => SITE_ID);
  const view = { audit: { id: AUDIT_ID } } as unknown as AuditView;
  const deps: ApiDeps = {
    logger,
    userFromToken: async (token) => (token === TOKEN ? USER : null),
    createDeps: () => ({
      ensureSite,
      requestAudit: async (input) => {
        requests.push(input);
        return {
          outcome: 'created',
          auditId: AUDIT_ID,
          retryAfterSeconds: null,
          ...outcome,
        };
      },
      trigger,
      allowLab: false,
      logger,
      ...overrides,
    }),
    readAudit: async (_token, id) => (id === AUDIT_ID ? view : null),
  };
  return { deps, requests, trigger, ensureSite, lines };
}

function post(body: unknown, token: string | null = TOKEN): Request {
  return new Request('http://localhost:8888/api/audits', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe('POST /api/audits', () => {
  it('crée un audit passif et réveille le background', async () => {
    const { deps, requests, trigger, ensureSite } = apiDeps();
    const res = await handleCreate(post({ url: 'exemple.fr' }), deps);
    expect(await read(res)).toEqual({
      status: 202,
      body: { auditId: AUDIT_ID, status: 'queued', existing: false },
    });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(ensureSite).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://exemple.fr' }),
    );
    expect(requests).toEqual([
      {
        userId: USER,
        siteId: SITE_ID,
        mode: 'passive',
        trigger: 'manual',
        methodVersion: METHOD_VERSION,
        engineVersion: ENGINE_VERSION,
      },
    ]);
    expect(trigger).toHaveBeenCalledOnce();
  });

  it('double clic : même audit, pas de second réveil', async () => {
    const { deps, trigger } = apiDeps({ outcome: 'existing' });
    expect(await read(await handleCreate(post({ url: 'a.fr' }), deps))).toEqual(
      { status: 200, body: { auditId: AUDIT_ID, existing: true } },
    );
    expect(trigger).not.toHaveBeenCalled();
  });

  it('réveil en échec : l’audit reste créé', async () => {
    const { deps, lines } = apiDeps(
      {},
      {
        trigger: async () => {
          throw new Error('trigger_rejected');
        },
      },
    );
    const res = await handleCreate(post({ url: 'a.fr' }), deps);
    expect(res.status).toBe(202);
    expect(lines.join('\n')).toContain('audit_trigger_failed');
  });

  it.each([
    ['host_limit', 900],
    ['user_limit', 3600],
  ] as const)('limite %s : 429 et Retry-After', async (outcome, retry) => {
    const { deps } = apiDeps({
      outcome,
      auditId: null,
      retryAfterSeconds: retry,
    });
    const res = await handleCreate(post({ url: 'a.fr' }), deps);
    expect(res.headers.get('retry-after')).toBe(String(retry));
    expect(await read(res)).toEqual({
      status: 429,
      body: {
        error: outcome,
        messageKey: `api.error.${outcome}`,
        retryAfter: retry,
      },
    });
  });

  it.each([
    ['site_not_found', 404],
    ['unverified', 403],
  ] as const)('%s → %i', async (outcome, status) => {
    const { deps } = apiDeps({ outcome, auditId: null });
    const res = await handleCreate(
      post({ siteId: SITE_ID, mode: 'active' }),
      deps,
    );
    expect(await read(res)).toEqual({
      status,
      body: { error: outcome, messageKey: `api.error.${outcome}` },
    });
  });

  it('refuse sans jeton, avec un faux jeton, ou hors POST', async () => {
    const { deps, requests } = apiDeps();
    expect((await handleCreate(post({ url: 'a.fr' }, null), deps)).status).toBe(
      401,
    );
    expect(
      (await handleCreate(post({ url: 'a.fr' }, 'faux-jeton-0123456789'), deps))
        .status,
    ).toBe(401);
    const get = new Request('http://localhost/api/audits');
    const res = await handleCreate(get, deps);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(requests).toEqual([]);
  });

  it.each([
    ['JSON invalide', '{', 'invalid_input'],
    ['champ inconnu', { url: 'a.fr', admin: true }, 'invalid_input'],
    ['corps trop gros', { url: `a.fr/${'x'.repeat(5000)}` }, 'invalid_input'],
    ['adresse privée', { url: 'http://127.0.0.1' }, 'invalid_url'],
    ['labo refusé', { url: 'bon.audigy.test' }, 'invalid_url'],
  ])('400 : %s', async (_name, body, code) => {
    const { deps, requests } = apiDeps();
    expect(await read(await handleCreate(post(body), deps))).toEqual({
      status: 400,
      body: { error: code, messageKey: `api.error.${code}` },
    });
    expect(requests).toEqual([]);
  });

  it('500 sans détail, jeton absent du journal', async () => {
    const { deps, lines } = apiDeps(
      {},
      {
        ensureSite: async () => {
          throw new Error(`échec ${TOKEN}`);
        },
      },
    );
    expect(await read(await handleCreate(post({ url: 'a.fr' }), deps))).toEqual(
      {
        status: 500,
        body: { error: 'internal', messageKey: 'api.error.internal' },
      },
    );
    expect(lines.join('\n')).toContain('api_create_failed');
    expect(lines.join('\n')).not.toContain(TOKEN);
  });
});

describe('GET /api/audits/:id', () => {
  const get = (token: string | null = TOKEN) =>
    new Request(`http://localhost/api/audits/${AUDIT_ID}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it('rend l’audit du propriétaire', async () => {
    const { deps } = apiDeps();
    expect(await read(await handleGet(get(), deps, AUDIT_ID))).toEqual({
      status: 200,
      body: { audit: { id: AUDIT_ID } },
    });
  });

  it('404 hors de ses audits, 400 sur un identifiant invalide, 401 sans jeton', async () => {
    const { deps } = apiDeps();
    expect(
      (await handleGet(get(), deps, '22222222-2222-4222-8222-222222222222'))
        .status,
    ).toBe(404);
    expect((await handleGet(get(), deps, '../x')).status).toBe(400);
    expect((await handleGet(get(), deps, undefined)).status).toBe(400);
    expect((await handleGet(get(null), deps, AUDIT_ID)).status).toBe(401);
  });
});

describe('audit-run-background', () => {
  const KEY = 'cle-service-role-de-test-0123456789';

  function runDeps(processed: string | null) {
    const { logger, lines } = captureLogger([KEY]);
    const deps: RunDeps = {
      key: KEY,
      logger,
      process: vi.fn(async () =>
        processed
          ? {
              auditId: processed,
              status: 'done' as const,
              runner: 'none' as const,
            }
          : null,
      ),
      chain: vi.fn(async () => {
        throw new Error('trigger_rejected');
      }),
    };
    return { deps, lines };
  }

  const run = (header: string | null) =>
    new Request('http://localhost/.netlify/functions/audit-run-background', {
      method: 'POST',
      headers: header ? { [TRIGGER_HEADER]: header } : {},
    });

  it('refuse un réveil non signé', async () => {
    const { deps } = runDeps(AUDIT_ID);
    expect((await handleRun(run(null), deps)).status).toBe(401);
    expect((await handleRun(run('1.abc'), deps)).status).toBe(401);
    expect(deps.process).not.toHaveBeenCalled();
  });

  it('traite un audit puis relance la file', async () => {
    const { deps, lines } = runDeps(AUDIT_ID);
    const res = await handleRun(run(signTrigger(KEY)), deps);
    expect(await read(res)).toEqual({
      status: 200,
      body: { processed: AUDIT_ID },
    });
    expect(deps.chain).toHaveBeenCalledOnce();
    expect(lines.join('\n')).toContain('audit_chain_failed');
  });

  it('file vide : pas de relance', async () => {
    const { deps } = runDeps(null);
    const res = await handleRun(run(signTrigger(KEY)), deps);
    expect(await res.json()).toEqual({ processed: null });
    expect(deps.chain).not.toHaveBeenCalled();
  });
});

describe('serve', () => {
  it('configuration absente : 500 sans détail', async () => {
    const { logger, lines } = captureLogger();
    const res = await serve(logger, async () => {
      throw new Error('missing_env');
    });
    expect(await read(res)).toEqual({
      status: 500,
      body: { error: 'internal', messageKey: 'api.error.internal' },
    });
    expect(lines).toEqual([
      JSON.stringify({
        level: 'error',
        event: 'api_unavailable',
        code: 'missing_env',
      }),
    ]);
  });
});
