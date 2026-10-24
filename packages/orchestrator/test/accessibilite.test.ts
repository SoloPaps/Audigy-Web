import {
  createAccessibiliteChecks,
  runChecks,
  scoreDomain,
} from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { createAuditContext, defaultChecks } from '../src/context.js';

describe('accès PSI', () => {
  it('est enregistré et, sans clé, reste non testé', async () => {
    const env = {};
    expect(
      defaultChecks(env).some((item) => item.id === 'accessibilite.lighthouse'),
    ).toBe(true);
    const { ctx, available } = createAuditContext({
      target: {
        url: new URL('https://exemple.test/'),
        scope: 'origin',
        hosting: 'other',
      },
      verified: false,
      env,
    });
    expect(available).not.toContain('psi');
    const [outcome] = await runChecks(
      createAccessibiliteChecks({ apiKey: () => undefined }),
      ctx,
      { available },
    );
    expect(outcome?.result).toMatchObject({
      status: 'untested',
      messageKey: 'accessibilite.lighthouse.missing_key',
      reason: 'accessibilite.lighthouse.missing_key',
    });
    const score = scoreDomain('accessibilite', outcome ? [outcome] : []);
    expect(score.score).toBeNull();
    expect(score.level).toBe('untested');
    expect(score.coverage).toBe(0);
  });
});
