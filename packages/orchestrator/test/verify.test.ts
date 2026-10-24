import type { Check } from '@audigy/engine';
import { FRESH_MS, TOKEN_RE } from '@audigy/engine';
import { describe, expect, it, vi } from 'vitest';
import {
  activeCheckEvent,
  applyProbe,
  checkEvent,
  createEvent,
  decideRecheck,
  handleCheckVerification,
  handleCreateVerification,
  handleRecheck,
  type OwnedSite,
  type OwnedVerification,
  processNextAudit,
  signTrigger,
  TRIGGER_HEADER,
  type VerificationDeps,
} from '../src/index.js';
import {
  AUDIT_ID,
  captureLogger,
  claimed,
  memoryStore,
  offlineContext,
  SITE_ID,
} from './helpers.js';

const USER = '11111111-1111-4111-8111-111111111111';
const VER_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'jeton-utilisateur-0123456789abcdef';
const NOW = new Date('2026-10-24T12:00:00.000Z');

const site: OwnedSite = {
  id: SITE_ID,
  ownerId: USER,
  host: 'exemple.fr',
  scope: 'origin',
  pathPrefix: null,
};

function verification(
  overrides: Partial<OwnedVerification> = {},
): OwnedVerification {
  return {
    id: VER_ID,
    siteId: SITE_ID,
    ownerId: USER,
    method: 'file',
    token: 'a'.repeat(43),
    status: 'pending',
    verifiedAt: null,
    host: 'exemple.fr',
    scope: 'origin',
    pathPrefix: null,
    ...overrides,
  };
}

function deps(overrides: Partial<VerificationDeps> = {}): {
  deps: VerificationDeps;
  lines: string[];
} {
  const { logger, lines } = captureLogger();
  return {
    lines,
    deps: {
      logger,
      userFromToken: async (token) => (token === TOKEN ? USER : null),
      loadSite: async () => site,
      loadVerification: async () => verification(),
      insertPending: async () => VER_ID,
      save: async () => {},
      appendAudit: async () => {},
      notifyExpired: async () => {},
      probe: async () => ({
        outcome: 'present',
        location: 'https://exemple.fr/audigy-verification.txt',
      }),
      now: () => NOW,
      ...overrides,
    },
  };
}

function post(
  url: string,
  body: unknown,
  token: string | null = TOKEN,
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const ownership = {
  host: 'exemple.fr',
  scope: 'origin' as const,
  pathPrefix: null,
};

describe('décision de revérification', () => {
  it('refuse une preuve de 10 min pile ou une autre portée', () => {
    const stale = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'dns_txt',
        lastCheckedAt: new Date(NOW.getTime() - FRESH_MS),
        ...ownership,
      },
      site: ownership,
      now: NOW,
      probe: 'skipped',
    });
    expect(stale.allowed).toBe(false);
    expect(stale.reason).toBe('stale');
    expect(stale.event?.action).toBe('active.refused');

    const fresh = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'dns_txt',
        lastCheckedAt: new Date(NOW.getTime() - FRESH_MS + 1),
        ...ownership,
      },
      site: ownership,
      now: NOW,
      probe: 'error',
    });
    expect(fresh.allowed).toBe(true);
    expect(fresh.event?.details.inconclusive).toBe('true');

    const broken = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'dns_txt',
        lastCheckedAt: new Date(NOW.getTime() - FRESH_MS),
        ...ownership,
      },
      site: ownership,
      now: NOW,
      probe: 'error',
    });
    expect(broken.allowed).toBe(false);
    expect(broken.reason).toBe('error');

    const scope = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'file',
        lastCheckedAt: NOW,
        host: 'solopaps.github.io',
        scope: 'path',
        pathPrefix: '/Projet-Site-Artiste/',
      },
      site: {
        host: 'solopaps.github.io',
        scope: 'origin',
        pathPrefix: null,
      },
      now: NOW,
      probe: 'present',
    });
    expect(scope.allowed).toBe(false);
    expect(scope.reason).toBe('scope');
    expect(scope.touchCheckedAt).toBe(false);

    const gone = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'meta',
        lastCheckedAt: NOW,
        ...ownership,
      },
      site: ownership,
      now: NOW,
      probe: 'absent',
    });
    expect(gone.allowed).toBe(false);
    expect(gone.nextStatus).toBe('expired');
    expect(gone.alert).toBe(true);
    expect(gone.event?.action).toBe('verification.expire');

    const ok = decideRecheck({
      actor: USER,
      siteId: SITE_ID,
      proof: {
        status: 'verified',
        method: 'dns_txt',
        lastCheckedAt: new Date(NOW.getTime() - 60_000),
        host: 'exemple.fr',
        scope: 'path',
        pathPrefix: '/blog/',
      },
      site: {
        host: 'exemple.fr',
        scope: 'path',
        pathPrefix: '/autre/',
      },
      now: NOW,
      probe: 'present',
    });
    expect(ok.allowed).toBe(true);
    expect(ok.event?.action).toBe('verification.recheck');
  });

  it('couvre le journal et le passage à expiré', () => {
    const pendingMiss = applyProbe({ previous: 'pending', outcome: 'absent' });
    expect(pendingMiss).toMatchObject({
      status: 'pending',
      alert: false,
      action: 'verification.check',
    });
    const verifiedMiss = applyProbe({
      previous: 'verified',
      outcome: 'absent',
    });
    expect(verifiedMiss).toMatchObject({
      status: 'expired',
      alert: true,
      action: 'verification.expire',
    });
    const actions = new Set([
      createEvent({
        actor: USER,
        siteId: SITE_ID,
        verificationId: VER_ID,
        method: 'file',
      }).action,
      checkEvent({
        actor: USER,
        siteId: SITE_ID,
        verificationId: VER_ID,
        method: 'file',
        status: 'pending',
        found: false,
        inconclusive: false,
        action: 'verification.check',
      }).action,
      'verification.recheck',
      'verification.expire',
      'active.refused',
      activeCheckEvent({
        actor: USER,
        siteId: SITE_ID,
        auditId: AUDIT_ID,
        checkId: 'securite.fichiers',
        status: 'untested',
      }).action,
    ]);
    expect([...actions].sort()).toEqual([
      'active.check',
      'active.refused',
      'verification.check',
      'verification.create',
      'verification.expire',
      'verification.recheck',
    ]);
  });
});

describe('POST /api/verifications', () => {
  it('prépare un jeton sans l’écrire dans le journal', async () => {
    const { deps: value, lines } = deps();
    const created = await handleCreateVerification(
      post('http://localhost/api/verifications', {
        siteId: SITE_ID,
        method: 'dns_txt',
      }),
      value,
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      status: string;
      token: string;
      dnsName: string;
    };
    expect(body.status).toBe('pending');
    expect(body.token).toMatch(TOKEN_RE);
    expect(body.dnsName).toBe('_audigy-challenge.exemple.fr');
    expect(lines.join('\n')).not.toContain(body.token);

    const denied = await handleCreateVerification(
      post('http://localhost/api/verifications', { siteId: SITE_ID }, null),
      value,
    );
    expect(denied.status).toBe(401);
    const invalid = await handleCreateVerification(
      post('http://localhost/api/verifications', { siteId: 'non' }),
      value,
    );
    expect(invalid.status).toBe(400);
    const missing = await handleCreateVerification(
      post('http://localhost/api/verifications', {
        siteId: SITE_ID,
        method: 'file',
      }),
      { ...value, loadSite: async () => null },
    );
    expect(missing.status).toBe(404);
  });

  it('vérifie, laisse un essai en attente, et expire une preuve disparue', async () => {
    const save = vi.fn(async () => {});
    const notify = vi.fn(async () => {});
    const audits: string[] = [];
    const { deps: value } = deps({
      save,
      notifyExpired: notify,
      appendAudit: async (event) => {
        audits.push(event.action);
      },
    });
    const found = await handleCheckVerification(
      post('http://localhost/api/verifications/check', {
        verificationId: VER_ID,
      }),
      value,
    );
    expect(((await found.json()) as { status: string }).status).toBe(
      'verified',
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'verified' }),
    );
    expect(audits).toEqual(['verification.check']);

    const still = await handleCheckVerification(
      post('http://localhost/api/verifications/check', {
        verificationId: VER_ID,
      }),
      {
        ...value,
        probe: async () => ({ outcome: 'absent', location: 'x' }),
      },
    );
    expect(((await still.json()) as { status: string }).status).toBe('pending');
    expect(notify).not.toHaveBeenCalled();

    const expired = await handleCheckVerification(
      post('http://localhost/api/verifications/check', {
        verificationId: VER_ID,
      }),
      {
        ...value,
        loadVerification: async () => verification({ status: 'verified' }),
        probe: async () => ({ outcome: 'absent', location: 'x' }),
      },
    );
    expect(((await expired.json()) as { status: string }).status).toBe(
      'expired',
    );
    expect(notify).toHaveBeenCalledOnce();
    expect(audits).toContain('verification.expire');

    const hidden = await handleCheckVerification(
      post('http://localhost/api/verifications/check', {
        verificationId: VER_ID,
      }),
      { ...value, loadVerification: async () => null },
    );
    expect(hidden.status).toBe(404);
  });
});

describe('relecture signée et audit actif', () => {
  it('refuse le réveil sans signature', async () => {
    const { logger } = captureLogger();
    const denied = await handleRecheck(
      new Request('http://localhost/recheck', { method: 'POST' }),
      {
        key: 'secret-role-key',
        logger,
        recheck: async () => ({ checked: 1, expired: 0 }),
      },
    );
    expect(denied.status).toBe(401);
    const ok = await handleRecheck(
      new Request('http://localhost/recheck', {
        method: 'POST',
        headers: { [TRIGGER_HEADER]: signTrigger('secret-role-key') },
      }),
      {
        key: 'secret-role-key',
        logger,
        recheck: async () => ({ checked: 2, expired: 1 }),
      },
    );
    expect(await ok.json()).toEqual({ checked: 2, expired: 1 });
  });

  it('journalise les checks actifs refusés sans les exécuter', async () => {
    const store = memoryStore([claimed('active')]);
    store.verifiedFresh = true;
    const events: { action: string; status: string }[] = [];
    store.appendAudit = async (entry) => {
      events.push({
        action: entry.action,
        status: String(entry.details.status),
      });
    };
    const active: Check = {
      id: 'securite.fichiers',
      domain: 'securite',
      mode: 'active',
      needs: ['http'],
      weight: 3,
      run: async () => {
        throw new Error('ne doit pas partir');
      },
    };
    const { logger } = captureLogger();
    const contexts: boolean[] = [];
    await processNextAudit({
      store,
      dispatcher: {
        dispatch: async () => ({ ok: false, reason: 'not_configured' }),
      },
      checks: [active],
      fixes: new Map(),
      context: (_target, verified) => {
        contexts.push(verified);
        return offlineContext(verified);
      },
      confirmActive: async () => ({ allowed: false, actor: USER }),
      logger,
      now: () => 0,
      sleep: async () => {},
      pollMs: 1,
      runnerWaitMs: 1,
    });
    expect(contexts).toEqual([false]);
    expect(events).toEqual([{ action: 'active.check', status: 'untested' }]);
  });
});
