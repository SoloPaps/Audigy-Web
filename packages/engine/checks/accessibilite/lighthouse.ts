import type {
  Check,
  CheckContext,
  CheckResult,
  Status,
} from '../../src/types.js';
import type { DayCache } from '../performance/cache.js';
import { percent, statusFromPercent } from '../performance/judge.js';
import { loadPsi } from '../performance/load.js';
import { PSI_SHARED_KEY, type PsiBundle } from '../performance/types.js';

const ID = 'accessibilite.lighthouse';

function finding(
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    score?: number;
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.score !== undefined) result.score = extra.score;
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if (status === 'warn' || status === 'fail') result.fixKey = ID;
  if (status === 'untested' || status === 'na') result.reason = messageKey;
  return result;
}

export function judgeAccessibiliteLighthouse(bundle: PsiBundle): CheckResult {
  if (!bundle.ok) {
    if (bundle.reason === 'missing_key') {
      return finding('untested', 1, 1, 'accessibilite.lighthouse.missing_key');
    }
    if (bundle.reason === 'quota') {
      return finding('untested', 1, 1, 'accessibilite.lighthouse.quota', {
        measured: { httpStatus: bundle.status ?? 429 },
      });
    }
    return finding(
      'untested',
      1,
      1,
      'accessibilite.lighthouse.error',
      bundle.status !== undefined
        ? { measured: { httpStatus: bundle.status } }
        : {},
    );
  }
  const mobile = bundle.mobile?.categories.accessibility ?? null;
  const desktop = bundle.desktop?.categories.accessibility ?? null;
  if (mobile === null && desktop === null) {
    return finding('untested', 1, 1, 'accessibilite.lighthouse.absent');
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
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'pass' ? 1 : 3,
    partial
      ? 'accessibilite.lighthouse.partial'
      : `accessibilite.lighthouse.${status}`,
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

export function createAccessibiliteLighthouseCheck(
  apiKey: () => string | undefined,
  cache: DayCache,
  timeoutMs: number,
): Check {
  return {
    id: ID,
    domain: 'accessibilite',
    mode: 'passive',
    // Sans clé, l’orchestrateur ne propose pas `psi`. Un besoin `psi`
    // remplacerait alors missing_key par « source manquante ».
    needs: [],
    weight: 3,
    timeoutMs,
    async run(ctx) {
      return judgeAccessibiliteLighthouse(await readPsi(ctx, apiKey, cache));
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
