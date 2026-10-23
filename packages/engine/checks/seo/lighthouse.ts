import type {
  Check,
  CheckContext,
  CheckResult,
  Status,
} from '../../src/types.js';
import type { DayCache } from '../performance/cache.js';
import { loadPsi } from '../performance/load.js';
import { PSI_SHARED_KEY, type PsiBundle } from '../performance/types.js';
import { finding } from './shared.js';

const ID = 'seo.lighthouse';

export function percent(score: number): number {
  return Math.round(score * 100);
}

function statusFromPercent(value: number): 'pass' | 'warn' | 'fail' {
  if (value >= 80) return 'pass';
  if (value >= 50) return 'warn';
  return 'fail';
}

export function judgeSeoLighthouse(bundle: PsiBundle): CheckResult {
  if (!bundle.ok) {
    if (bundle.reason === 'missing_key') {
      return finding(ID, 'untested', 1, 1, 'seo.lighthouse.missing_key');
    }
    if (bundle.reason === 'quota') {
      return finding(ID, 'untested', 1, 1, 'seo.lighthouse.quota', {
        measured: { httpStatus: bundle.status ?? 429 },
      });
    }
    return finding(
      ID,
      'untested',
      1,
      1,
      'seo.lighthouse.error',
      bundle.status !== undefined
        ? { measured: { httpStatus: bundle.status } }
        : {},
    );
  }
  const mobile = bundle.mobile?.categories.seo ?? null;
  const desktop = bundle.desktop?.categories.seo ?? null;
  if (mobile === null && desktop === null) {
    return finding(ID, 'untested', 1, 1, 'seo.lighthouse.absent');
  }
  const partial = mobile === null || desktop === null;
  const raw = Math.min(
    ...[mobile, desktop].filter((value): value is number => value !== null),
  );
  const points = percent(raw);
  const base = statusFromPercent(points);
  const status: Status = partial && base === 'pass' ? 'warn' : base;
  const measured: Record<string, unknown> = { score: points / 100 };
  if (mobile !== null) measured.mobile = percent(mobile) / 100;
  if (desktop !== null) measured.desktop = percent(desktop) / 100;
  const version =
    bundle.mobile?.lighthouseVersion ?? bundle.desktop?.lighthouseVersion;
  if (version) measured.lighthouseVersion = version;
  return finding(
    ID,
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 3,
    partial ? 'seo.lighthouse.partial' : `seo.lighthouse.${status}`,
    {
      score: points / 100,
      params: partial
        ? { score: points }
        : {
            mobile: percent(mobile as number),
            desktop: percent(desktop as number),
          },
      measured,
    },
  );
}

export function createLighthouseCheck(
  apiKey: () => string | undefined,
  cache: DayCache,
  timeoutMs: number,
): Check {
  return {
    id: ID,
    domain: 'seo',
    mode: 'passive',
    needs: ['psi'],
    weight: 3,
    timeoutMs,
    async run(ctx) {
      return judgeSeoLighthouse(await readPsi(ctx, apiKey, cache));
    },
  };
}

async function readPsi(
  ctx: CheckContext,
  apiKey: () => string | undefined,
  cache: DayCache,
): Promise<PsiBundle> {
  if (ctx.shared.has(PSI_SHARED_KEY)) {
    return ctx.shared.get(PSI_SHARED_KEY, async () => {
      throw new Error('psi');
    });
  }
  const key = apiKey();
  const api = ctx.net.api;
  if (!api || !key) {
    return ctx.shared.get(PSI_SHARED_KEY, async () => ({
      ok: false as const,
      reason: 'missing_key' as const,
    }));
  }
  return loadPsi(ctx, api, key, cache);
}
