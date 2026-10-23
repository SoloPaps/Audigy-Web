import { NetError } from '@audigy/net';
import { describe, expect, it, vi } from 'vitest';
import { fr } from '../../../apps/web/src/i18n/fr.js';
import {
  type Check,
  type CheckContext,
  REASONS,
  runChecks,
} from '../src/index.js';
import { fakeCheck, makeContext, result } from './helpers.js';

describe('runChecks — garde passif/actif', () => {
  it('n’exécute jamais un check actif si verified=false', async () => {
    const run = vi.fn(async () => result('pass'));
    const check = fakeCheck('securite.actif', run, { mode: 'active' });
    const [outcome] = await runChecks(
      [check],
      makeContext({ verified: false }),
    );
    expect(run).not.toHaveBeenCalled();
    expect(outcome?.result).toMatchObject({
      status: 'untested',
      reason: REASONS.activeUnverified,
    });
  });

  it('refuse toute valeur de verified autre que true', async () => {
    const run = vi.fn(async () => result('pass'));
    const check = fakeCheck('securite.actif', run, { mode: 'active' });
    for (const verified of [1, 'true', {}, null, undefined]) {
      const ctx = { ...makeContext(), verified } as unknown as CheckContext;
      await runChecks([check], ctx);
    }
    expect(run).not.toHaveBeenCalled();
  });

  it('exécute un check actif si verified=true, et les passifs dans tous les cas', async () => {
    const active = vi.fn(async () => result('pass'));
    const passive = vi.fn(async () => result('pass'));
    const checks = [
      fakeCheck('securite.actif', active, { mode: 'active' }),
      fakeCheck('seo.passif', passive),
    ];
    await runChecks(checks, makeContext({ verified: false }));
    expect(passive).toHaveBeenCalledTimes(1);
    expect(active).not.toHaveBeenCalled();
    await runChecks(checks, makeContext({ verified: true }));
    expect(active).toHaveBeenCalledTimes(1);
  });

  it('fournit un contexte figé : un check ne peut pas basculer verified', async () => {
    let frozen = false;
    const check = fakeCheck('seo.passif', async (ctx) => {
      frozen = Object.isFrozen(ctx);
      return result('pass');
    });
    await runChecks([check], makeContext());
    expect(frozen).toBe(true);
  });
});

describe('runChecks — erreurs et délais → untested avec raison', () => {
  it('erreur levée', async () => {
    const check = fakeCheck('seo.casse', async () => {
      throw new Error('boum');
    });
    const [outcome] = await runChecks([check], makeContext());
    expect(outcome?.result).toEqual({
      status: 'untested',
      severity: 1,
      impact: 1,
      messageKey: REASONS.error,
      reason: REASONS.error,
    });
  });

  it('erreur réseau : code conservé, message technique écarté', async () => {
    const check = fakeCheck('seo.reseau', async () => {
      throw new NetError('BLOCKED_ADDRESS', 'détail interne 10.0.0.1');
    });
    const [outcome] = await runChecks([check], makeContext());
    expect(outcome?.result.reason).toBe(REASONS.error);
    expect(outcome?.result.measured).toEqual({ errorCode: 'BLOCKED_ADDRESS' });
    expect(JSON.stringify(outcome)).not.toContain('10.0.0.1');
  });

  it('délai dépassé : signal interrompu, raison et durée', async () => {
    let aborted = false;
    const check = fakeCheck(
      'seo.lent',
      (ctx) =>
        new Promise((_, reject) => {
          ctx.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('interrompu'));
          });
        }),
      { timeoutMs: 20 },
    );
    const [outcome] = await runChecks([check], makeContext());
    expect(aborted).toBe(true);
    expect(outcome?.result).toMatchObject({
      status: 'untested',
      reason: REASONS.timeout,
      params: { seconds: 1 },
    });
  });

  it('délai par défaut du runner', async () => {
    const check = fakeCheck('seo.jamais', () => new Promise(() => {}));
    const [outcome] = await runChecks([check], makeContext(), {
      timeoutMs: 15,
    });
    expect(outcome?.result.reason).toBe(REASONS.timeout);
  });

  it('source absente : non exécuté', async () => {
    const run = vi.fn(async () => result('pass'));
    const check = fakeCheck('performance.psi', run, { needs: ['psi'] });
    const [outcome] = await runChecks([check], makeContext());
    expect(run).not.toHaveBeenCalled();
    expect(outcome?.result).toMatchObject({
      reason: REASONS.missingSource,
      params: { source: 'psi' },
    });
    const [ok] = await runChecks([check], makeContext(), {
      available: ['http', 'psi'],
    });
    expect(ok?.result.status).toBe('pass');
  });

  it.each([
    ['statut inconnu', { ...result('pass'), status: 'ok' }],
    ['score > 1', result('pass', { score: 1.5 })],
    ['score NaN', result('warn', { score: Number.NaN })],
    ['sévérité hors bornes', { ...result('fail'), severity: 5 }],
    ['clé vide', result('pass', { messageKey: '' })],
    ['untested sans raison', { ...result('pass'), status: 'untested' }],
    ['pas un objet', null],
  ])('résultat invalide (%s)', async (_label, value) => {
    const check = fakeCheck('seo.invalide', async () => value as never);
    const [outcome] = await runChecks([check], makeContext());
    expect(outcome?.result.reason).toBe(REASONS.invalidResult);
  });

  it('les raisons existent dans le dictionnaire fr', () => {
    for (const key of Object.values(REASONS)) expect(fr).toHaveProperty(key);
  });
});

describe('runChecks — concurrence', () => {
  it('respecte la limite et garde l’ordre d’entrée', async () => {
    let running = 0;
    let peak = 0;
    const checks: Check[] = Array.from({ length: 8 }, (_, i) =>
      fakeCheck(`seo.c${i}`, async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 8 - i));
        running--;
        return result('pass', { params: { i } });
      }),
    );
    const outcomes = await runChecks(checks, makeContext(), { concurrency: 3 });
    expect(peak).toBe(3);
    expect(outcomes.map((o) => o.checkId)).toEqual(checks.map((c) => c.id));
  });

  it('refuse une concurrence ou un délai invalides', async () => {
    await expect(
      runChecks([], makeContext(), { concurrency: 0 }),
    ).rejects.toThrow();
    await expect(
      runChecks([], makeContext(), { timeoutMs: -1 }),
    ).rejects.toThrow();
  });
});
