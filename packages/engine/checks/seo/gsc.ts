import type {
  GscFailure,
  GscSitemapEntry,
  GscSnapshot,
} from '../../src/gsc.js';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { finding } from './shared.js';

const SITEMAPS = 'seo.gsc_sitemaps';
const INSPECTION = 'seo.gsc_inspection';
const INDEXED = 'seo.gsc_indexed';
const SHARED = 'gsc-snapshot';
const TIMEOUT_MS = 45_000;

/** Au moins huit pages indexées pour dix annoncées. */
const INDEXED_NUMERATOR = 4;
const INDEXED_DENOMINATOR = 5;

type Loaded = GscSnapshot | 'missing';

function connect(id: string): CheckResult {
  return finding(id, 'untested', 1, 1, 'seo.gsc.untested_connect', {
    measured: { connected: false },
  });
}

function fromFailure(id: string, failure: GscFailure): CheckResult {
  if (failure === 'quota') {
    return finding(id, 'untested', 1, 1, 'seo.gsc.untested_quota');
  }
  if (failure === 'auth') {
    return finding(id, 'untested', 1, 1, 'seo.gsc.untested_auth', {
      measured: { connected: false },
    });
  }
  return finding(id, 'untested', 1, 1, 'seo.gsc.untested_error');
}

function propertyMiss(id: string): CheckResult {
  return finding(id, 'untested', 1, 1, 'seo.gsc.untested_property');
}

async function load(ctx: CheckContext): Promise<Loaded> {
  const gsc = ctx.net.gsc;
  if (!gsc) return 'missing';
  const pageUrl = ctx.target.url.href;
  return ctx.shared.get(SHARED, async () => {
    try {
      return await gsc.snapshot(pageUrl, ctx.signal);
    } catch {
      const failure: GscFailure = 'error';
      return {
        sites: failure,
        property: null,
        sitemaps: { ok: false as const, failure },
        inspection: { ok: false as const, failure },
      };
    }
  });
}

function blocked(id: string, snapshot: GscSnapshot): CheckResult | null {
  if (snapshot.sites !== 'ok') return fromFailure(id, snapshot.sites);
  if (snapshot.property === null) return propertyMiss(id);
  return null;
}

function sums(entries: readonly GscSitemapEntry[]): {
  errors: number;
  warnings: number;
  submitted: number;
  indexed: number;
} {
  const leaves = entries.filter((entry) => !entry.isIndex);
  const counted = leaves.length > 0 ? leaves : entries;
  return {
    errors: entries.reduce((total, entry) => total + entry.errors, 0),
    warnings: entries.reduce((total, entry) => total + entry.warnings, 0),
    submitted: counted.reduce((total, entry) => total + entry.submitted, 0),
    indexed: counted.reduce((total, entry) => total + entry.indexed, 0),
  };
}

function judgeSitemaps(snapshot: GscSnapshot): CheckResult {
  const stopped = blocked(SITEMAPS, snapshot);
  if (stopped) return stopped;
  if (!snapshot.sitemaps.ok)
    return fromFailure(SITEMAPS, snapshot.sitemaps.failure);
  const entries = snapshot.sitemaps.entries;
  const totals = sums(entries);
  const measured = {
    property: snapshot.property,
    sitemaps: entries.length,
    errors: totals.errors,
    warnings: totals.warnings,
  };
  if (entries.length === 0) {
    return finding(SITEMAPS, 'warn', 2, 2, 'seo.gsc_sitemaps.warn_none', {
      measured,
    });
  }
  if (totals.errors > 0) {
    return finding(SITEMAPS, 'fail', 3, 2, 'seo.gsc_sitemaps.fail', {
      measured,
    });
  }
  if (totals.warnings > 0) {
    return finding(SITEMAPS, 'warn', 2, 2, 'seo.gsc_sitemaps.warn_warnings', {
      measured,
    });
  }
  if (entries.every((entry) => entry.pending)) {
    return finding(SITEMAPS, 'warn', 2, 1, 'seo.gsc_sitemaps.warn_pending', {
      measured,
    });
  }
  return finding(SITEMAPS, 'pass', 1, 1, 'seo.gsc_sitemaps.pass', { measured });
}

function judgeInspection(snapshot: GscSnapshot): CheckResult {
  const stopped = blocked(INSPECTION, snapshot);
  if (stopped) return stopped;
  if (!snapshot.inspection.ok) {
    return fromFailure(INSPECTION, snapshot.inspection.failure);
  }
  const verdict = snapshot.inspection.verdict;
  const measured = { property: snapshot.property, verdict };
  if (verdict === 'PASS') {
    return finding(INSPECTION, 'pass', 1, 1, 'seo.gsc_inspection.pass', {
      measured,
    });
  }
  if (verdict === 'FAIL') {
    return finding(INSPECTION, 'fail', 3, 3, 'seo.gsc_inspection.fail', {
      measured,
    });
  }
  return finding(INSPECTION, 'warn', 2, 2, 'seo.gsc_inspection.warn', {
    measured,
  });
}

function judgeIndexed(snapshot: GscSnapshot): CheckResult {
  const stopped = blocked(INDEXED, snapshot);
  if (stopped) return stopped;
  if (!snapshot.sitemaps.ok)
    return fromFailure(INDEXED, snapshot.sitemaps.failure);
  const totals = sums(snapshot.sitemaps.entries);
  const measured = {
    property: snapshot.property,
    submitted: totals.submitted,
    indexed: totals.indexed,
  };
  if (totals.submitted === 0) {
    return finding(INDEXED, 'warn', 2, 2, 'seo.gsc_indexed.warn_none', {
      measured,
    });
  }
  if (totals.indexed === 0) {
    return finding(INDEXED, 'fail', 3, 2, 'seo.gsc_indexed.fail', { measured });
  }
  if (
    totals.indexed * INDEXED_DENOMINATOR >=
    totals.submitted * INDEXED_NUMERATOR
  ) {
    return finding(INDEXED, 'pass', 1, 1, 'seo.gsc_indexed.pass', { measured });
  }
  return finding(INDEXED, 'warn', 2, 2, 'seo.gsc_indexed.warn_partial', {
    measured,
  });
}

function check(
  id: string,
  weight: 1 | 2 | 3,
  judge: (snapshot: GscSnapshot) => CheckResult,
): Check {
  return {
    id,
    domain: 'seo',
    mode: 'passive',
    needs: ['gsc'],
    weight,
    timeoutMs: TIMEOUT_MS,
    async run(ctx) {
      const snapshot = await load(ctx);
      if (snapshot === 'missing') return connect(id);
      return judge(snapshot);
    },
  };
}

export const gscSitemapsCheck = check(SITEMAPS, 2, judgeSitemaps);
export const gscInspectionCheck = check(INSPECTION, 2, judgeInspection);
export const gscIndexedCheck = check(INDEXED, 1, judgeIndexed);

export const GSC_CHECKS: readonly Check[] = [
  gscIndexedCheck,
  gscInspectionCheck,
  gscSitemapsCheck,
];
