import {
  BROWSER_SHARED_KEY,
  type BrowserAuditResult,
  BrowserAuditResultSchema,
} from '@audigy/browser-runner/schema';
import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { finding } from '../securite/shared.js';

const ID = 'accessibilite.axe';

/** Couverture déclarée partielle : ce n’est pas un RGAA complet. */
const PARTIAL = 'partial';

function scored(
  status: 'pass' | 'warn' | 'fail',
  messageKey: string,
  params: Record<string, string | number>,
  measured: Record<string, unknown>,
): CheckResult {
  const result = finding(
    ID,
    status,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    status === 'fail' ? 3 : status === 'warn' ? 2 : 1,
    messageKey,
    { params, measured },
  );
  result.score = status === 'pass' ? 1 : status === 'warn' ? 0.5 : 0;
  return result;
}

export function judgeAxe(
  input: 'absent' | 'invalid' | BrowserAuditResult,
): CheckResult {
  if (input === 'absent') {
    return finding(ID, 'untested', 1, 1, `${ID}.untested`, {
      reason: 'reason.runner_absent',
    });
  }
  if (input === 'invalid') {
    return finding(ID, 'untested', 1, 1, `${ID}.invalid`);
  }
  const axe = input.axe;
  if (!axe) return finding(ID, 'untested', 1, 1, `${ID}.absent`);
  const measured: Record<string, unknown> = {
    coverage: PARTIAL,
    violations: axe.violations.map((rule) => rule.id).slice(0, 8),
  };
  if (input.rgaa) {
    measured.criteriaMapped = input.rgaa.criteriaMapped;
    measured.criteriaTotal = input.rgaa.criteriaTotal;
    measured.failedCriteria = input.rgaa.criteria
      .filter((item) => item.status === 'fail')
      .map((item) => item.id)
      .slice(0, 8);
  }
  const rules = axe.violations
    .slice(0, 3)
    .map((rule) => rule.id)
    .join(', ');
  if (axe.violations.length > 0) {
    return scored(
      'fail',
      `${ID}.fail`,
      { count: axe.violations.length, rules },
      measured,
    );
  }
  const pending = axe.incomplete
    .slice(0, 3)
    .map((rule) => rule.id)
    .join(', ');
  if (axe.incomplete.length > 0) {
    return scored(
      'warn',
      `${ID}.warn`,
      { count: axe.incomplete.length, rules: pending },
      measured,
    );
  }
  return scored('pass', `${ID}.pass`, {}, measured);
}

async function readBrowser(
  ctx: CheckContext,
): Promise<'absent' | 'invalid' | BrowserAuditResult> {
  if (!ctx.shared.has(BROWSER_SHARED_KEY)) return 'absent';
  const raw: unknown = await ctx.shared.get(
    BROWSER_SHARED_KEY,
    async () => null,
  );
  const parsed = BrowserAuditResultSchema.safeParse(raw);
  if (!parsed.success) return 'invalid';
  return parsed.data;
}

export function createAccessibiliteAxeCheck(): Check {
  return {
    id: ID,
    domain: 'accessibilite',
    mode: 'passive',
    needs: ['browser'],
    weight: 1,
    async run(ctx) {
      return judgeAxe(await readBrowser(ctx));
    },
  };
}
