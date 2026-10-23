import type { Check, CheckContext, CheckResult } from '../../src/types.js';
import { parseDkim } from './parse.js';
import {
  finding,
  intendsMail,
  lookup,
  readMx,
  runDns,
  txtOf,
} from './shared.js';

const ID = 'dns_email.dkim';

/** Sélecteurs courants. L’absence ne prouve pas qu’aucune signature n’existe. */
export const DKIM_SELECTORS = [
  'default',
  'google',
  'selector1',
  'selector2',
  'k1',
  'mail',
  's1',
  's2',
  'dkim',
] as const;

export async function judgeDkim(
  ctx: CheckContext,
  domain: string,
): Promise<CheckResult> {
  const mx = await readMx(ctx, domain);
  if (!intendsMail(mx)) {
    return finding('na', 1, 1, 'dns_email.dkim.na_nomail', {
      measured: { mail: mx.mode },
    });
  }
  const found: (typeof DKIM_SELECTORS)[number][] = [];
  let invalid = false;
  await Promise.all(
    DKIM_SELECTORS.map(async (selector) => {
      const texts = txtOf(
        await lookup(ctx, `${selector}._domainkey.${domain}`, 'TXT'),
      );
      let valid = false;
      let bad = false;
      for (const text of texts) {
        const parsed = parseDkim(text);
        if (parsed === 'valid') valid = true;
        else if (parsed === 'invalid') bad = true;
      }
      if (valid) found.push(selector);
      else if (bad) invalid = true;
    }),
  );
  found.sort((a, b) => DKIM_SELECTORS.indexOf(a) - DKIM_SELECTORS.indexOf(b));
  if (found.length > 0) {
    return finding('pass', 1, 1, 'dns_email.dkim.pass', {
      params: { selectors: found.join(', ') },
      measured: { selectors: found },
    });
  }
  if (invalid) {
    return finding('warn', 2, 2, 'dns_email.dkim.warn_invalid', {
      fixKey: ID,
      measured: { selectors: [] },
    });
  }
  return finding('warn', 2, 2, 'dns_email.dkim.warn_missing', {
    fixKey: ID,
    measured: { selectors: DKIM_SELECTORS },
  });
}

export const dkimCheck: Check = {
  id: ID,
  domain: 'dns_email',
  mode: 'passive',
  needs: ['dns'],
  weight: 2,
  run: (ctx) => runDns(ctx, judgeDkim),
};
