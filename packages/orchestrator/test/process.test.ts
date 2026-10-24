import type { FixSheet } from '@audigy/engine';
import { describe, expect, it, vi } from 'vitest';
import {
  assemble,
  browserPlaceholders,
  type Dispatcher,
  findingRows,
  ORCHESTRATION_REASONS,
  type ProcessDeps,
  processNextAudit,
  RUNNER_WAIT_MS,
  STALE_AFTER_MINUTES,
  splitChecks,
} from '../src/index.js';
import {
  AUDIT_ID,
  browserCheck,
  captureLogger,
  claimed,
  failingCheck,
  type MemoryStore,
  memoryStore,
  offlineContext,
  serverCheck,
} from './helpers.js';

const FIXES = new Map<string, FixSheet>([
  [
    'seo.fictif',
    { id: 'seo.fictif', effortMinutes: 15 } as unknown as FixSheet,
  ],
]);

function deps(
  store: MemoryStore,
  dispatcher: Dispatcher,
  extra: Partial<ProcessDeps> = {},
) {
  const { logger, lines } = captureLogger();
  let clock = 0;
  const contexts: boolean[] = [];
  const value: ProcessDeps = {
    store,
    dispatcher,
    checks: [serverCheck, failingCheck, browserCheck],
    fixes: FIXES,
    context: (_target, verified) => {
      contexts.push(verified);
      return offlineContext(verified);
    },
    logger,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    pollMs: 1000,
    runnerWaitMs: 5000,
    ...extra,
  };
  return { value, lines, contexts };
}

const absent: Dispatcher = {
  dispatch: async () => ({ ok: false, reason: 'not_configured' }),
};

function reasonOf(store: MemoryStore, index: number, checkId: string) {
  return store.writes[index]?.findings.find((f) => f.check_id === checkId);
}

describe('pipeline', () => {
  it('sépare les checks navigateur', () => {
    const { server, browser } = splitChecks([serverCheck, browserCheck]);
    expect(server.map((c) => c.id)).toEqual(['securite.fictif']);
    expect(browser.map((c) => c.id)).toEqual(['accessibilite.fictif']);
  });

  it('assemble des scores stables et nettoie les raisons invalides', () => {
    const outcomes = [
      ...browserPlaceholders(
        [browserCheck],
        ORCHESTRATION_REASONS.runnerAbsent,
      ),
      {
        checkId: 'securite.fictif',
        domain: 'securite' as const,
        mode: 'passive' as const,
        weight: 2 as const,
        result: {
          status: 'untested' as const,
          severity: 1 as const,
          impact: 1 as const,
          messageKey: 'x',
          reason: 'Raison Libre !',
        },
      },
    ];
    const summary = assemble(outcomes);
    expect(summary.outcomes.map((o) => o.checkId)).toEqual([
      'accessibilite.fictif',
      'securite.fictif',
    ]);
    expect(summary.global.score).toBeNull();
    expect(findingRows(summary).map((r) => r.reason)).toEqual([
      'reason.runner_absent',
      'reason.invalid_result',
    ]);
  });
});

describe('processNextAudit', () => {
  it('file vide : rien', async () => {
    const store = memoryStore();
    const { value } = deps(store, absent);
    expect(await processNextAudit(value)).toBeNull();
    expect(store.staleCalls).toEqual([STALE_AFTER_MINUTES]);
  });

  it('runner absent : partial puis done, navigateur non testé avec raison', async () => {
    const store = memoryStore([claimed()]);
    const dispatch = vi.fn(absent.dispatch);
    const { value, lines } = deps(store, { dispatch });
    const result = await processNextAudit(value);
    expect(result).toEqual({
      auditId: AUDIT_ID,
      status: 'done',
      runner: 'reason.runner_absent',
    });
    expect(dispatch).toHaveBeenCalledWith(AUDIT_ID);
    expect(store.writes.map((w) => w.status)).toEqual(['partial', 'done']);
    expect(reasonOf(store, 0, 'accessibilite.fictif')).toMatchObject({
      status: 'untested',
      reason: 'reason.runner_pending',
    });
    expect(reasonOf(store, 1, 'accessibilite.fictif')).toMatchObject({
      status: 'untested',
      reason: 'reason.runner_absent',
    });
    const seo = reasonOf(store, 1, 'seo.fictif');
    expect(seo).toMatchObject({ status: 'fail', effort_minutes: 15 });
    expect(store.writes[1]?.globalScore).not.toBeNull();
    expect(lines.join('\n')).toContain('runner_absent');
  });

  it('runner trop lent : attente bornée puis absent', async () => {
    const store = memoryStore([claimed()]);
    const read = vi.spyOn(store, 'readRunnerOutput');
    const { value } = deps(store, { dispatch: async () => ({ ok: true }) });
    const result = await processNextAudit(value);
    expect(result?.runner).toBe(ORCHESTRATION_REASONS.runnerAbsent);
    expect(read).toHaveBeenCalledTimes(6);
    expect(store.writes.map((w) => w.status)).toEqual(['partial', 'done']);
  });

  it('respecte le budget de la fonction background', async () => {
    const store = memoryStore([claimed()]);
    const read = vi.spyOn(store, 'readRunnerOutput');
    const { value } = deps(
      store,
      { dispatch: async () => ({ ok: true }) },
      { runnerWaitMs: RUNNER_WAIT_MS, budgetMs: 3000 },
    );
    await processNextAudit(value);
    expect(read).toHaveBeenCalledTimes(4);
  });

  it('sortie du runner : fusion et score', async () => {
    const store = memoryStore([claimed()]);
    store.runnerOutput = { contrast: true };
    const { value } = deps(store, { dispatch: async () => ({ ok: true }) });
    const result = await processNextAudit(value);
    expect(result?.runner).toBe('merged');
    expect(reasonOf(store, 1, 'accessibilite.fictif')).toMatchObject({
      status: 'pass',
      reason: null,
    });
    expect(
      store.writes[1]?.domainScores.find((d) => d.domain === 'accessibilite')
        ?.score,
    ).toBe(100);
  });

  it('sans check navigateur : pas de déclenchement', async () => {
    const store = memoryStore([claimed()]);
    const dispatch = vi.fn(absent.dispatch);
    const { value } = deps(store, { dispatch }, { checks: [serverCheck] });
    expect((await processNextAudit(value))?.runner).toBe('none');
    expect(dispatch).not.toHaveBeenCalled();
    expect(store.writes.map((w) => w.status)).toEqual(['partial', 'done']);
  });

  it('actif : vérifié seulement si la vérification est fraîche', async () => {
    const store = memoryStore([claimed('active'), claimed('passive')]);
    store.verifiedFresh = true;
    const { value, contexts } = deps(store, absent, { checks: [serverCheck] });
    await processNextAudit(value);
    await processNextAudit(value);
    store.queue.push(claimed('active'));
    store.verifiedFresh = false;
    await processNextAudit(value);
    expect(contexts).toEqual([true, false, false]);
  });

  it('erreur : failed avec un code, sans message', async () => {
    const store = memoryStore([claimed()]);
    const { value, lines } = deps(store, {
      dispatch: async () => {
        throw new Error('Bearer ghp_secret0123456789 refusé');
      },
    });
    const result = await processNextAudit(value);
    expect(result).toEqual({
      auditId: AUDIT_ID,
      status: 'failed',
      runner: 'none',
    });
    expect(store.writes.map((w) => w.status)).toEqual(['partial', 'failed']);
    expect(store.writes[1]?.error).toBe('engine_error');
    expect(store.writes[1]?.findings.length).toBe(3);
    expect(lines.join('\n')).not.toContain('ghp_');
  });
});
