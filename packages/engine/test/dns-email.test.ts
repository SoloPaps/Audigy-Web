import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DnsAnswer,
  type DnsType,
  type DohResolver,
  NetError,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { DKIM_SELECTORS, DNS_EMAIL_CHECKS } from '../checks/dns_email/index.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type Check,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
  scoreDomain,
} from '../src/index.js';

const ORIGIN = 'https://exemple.test';
const seen = new Set<string>();

type Rdata = string[] | 'servfail';
interface Node {
  ad?: boolean;
  rcode?: number;
  A?: Rdata;
  AAAA?: Rdata;
  MX?: Rdata;
  TXT?: Rdata;
  CAA?: Rdata;
  SOA?: Rdata;
}
type Zone = Record<string, Node>;

const POLICY = `version: STSv1
mode: enforce
mx: mail.exemple.test
max_age: 86400
`;

const KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';

function goodZone(): Zone {
  return {
    'exemple.test': {
      ad: true,
      TXT: ['google-site-verification=abc', 'v=spf1 ip4:192.0.2.10 -all'],
      MX: ['10 mail.exemple.test.'],
      CAA: ['0 issue "letsencrypt.org"'],
      SOA: [
        'ns.exemple.test. hostmaster.exemple.test. 1 7200 600 1209600 3600',
      ],
      A: ['192.0.2.10'],
    },
    'mail.exemple.test': { A: ['192.0.2.10'] },
    '_dmarc.exemple.test': {
      TXT: ['v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@exemple.test'],
    },
    'google._domainkey.exemple.test': {
      TXT: [`v=DKIM1; k=rsa; p=${KEY}`],
    },
    '_mta-sts.exemple.test': { TXT: ['v=STSv1; id=2026102301'] },
    '_smtp._tls.exemple.test': {
      TXT: ['v=TLSRPTv1; rua=mailto:tls@exemple.test'],
    },
  };
}

function merge(patch: Zone): Zone {
  const zone = goodZone();
  for (const [name, node] of Object.entries(patch)) {
    zone[name] = { ...zone[name], ...node };
  }
  return zone;
}

function reply(zone: Zone, name: string, type: DnsType): DnsAnswer {
  const host = name.toLowerCase().replace(/\.$/, '');
  const node = zone[host];
  if (!node || node.rcode === 3) {
    return { status: 3, authenticated: false, records: [] };
  }
  if (node.rcode === 2) {
    return { status: 2, authenticated: false, records: [] };
  }
  const bucket = node[type as keyof Node];
  if (bucket === 'servfail') {
    return { status: 2, authenticated: false, records: [] };
  }
  if (!Array.isArray(bucket)) {
    return { status: 0, authenticated: node.ad === true, records: [] };
  }
  return {
    status: 0,
    authenticated: node.ad === true,
    records: bucket.map((data) => ({ name: host, type, ttl: 300, data })),
  };
}

function page(url: string, status: number, body: string): SafeResponse {
  return {
    url,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    body: new TextEncoder().encode(body),
    transferBytes: new TextEncoder().encode(body).length,
    ip: '192.0.2.10',
    redirects: [],
    text: () => body,
  };
}

function harness(
  options: {
    target?: string;
    scope?: 'origin' | 'path';
    hosting?: 'netlify' | 'github_pages' | 'other';
    zone?: Zone;
    policy?: { status: number; body: string } | 'error';
    dnsError?: boolean;
  } = {},
): { ctx: RunContext; calls: string[] } {
  const zone = options.zone ?? goodZone();
  const calls: string[] = [];
  const dns: DohResolver = {
    query: (name, type) => {
      calls.push(`${type} ${name}`);
      if (options.dnsError) {
        return Promise.reject(new NetError('DNS_FAILURE', 'panne'));
      }
      return Promise.resolve(reply(zone, name, type));
    },
    addresses: () => Promise.reject(new Error('adresses non utilisées')),
  };
  const fetch: SafeFetch = async (input, init) => {
    const url = String(input);
    calls.push(`GET ${url}`);
    expect(init?.signal).toBeTypeOf('object');
    const policy = options.policy ?? { status: 200, body: POLICY };
    if (policy === 'error') throw new NetError('DNS_FAILURE', 'fichier');
    return page(url, policy.status, policy.body);
  };
  const tls: TlsProbe = () => Promise.reject(new Error('tls non utilisé'));
  return {
    calls,
    ctx: {
      target: {
        url: new URL(options.target ?? `${ORIGIN}/`),
        scope: options.scope ?? 'origin',
        hosting: options.hosting ?? 'other',
      },
      verified: false,
      net: { fetch, dns, tls },
      shared: createSharedArtifacts(),
      budget: createRequestBudget({ perHostIntervalMs: 0 }),
      now: () => new Date('2026-10-23T12:00:00.000Z'),
    },
  };
}

const byId = Object.fromEntries(
  DNS_EMAIL_CHECKS.map((check) => [check.id, check]),
);

function check(id: string): Check {
  const found = byId[id];
  if (!found) throw new Error(id);
  return found;
}

async function run(
  id: string,
  options: Parameters<typeof harness>[0] = {},
): Promise<{ result: CheckResult; calls: string[] }> {
  const { ctx, calls } = harness(options);
  const [outcome] = await runChecks([check(id)], ctx, { concurrency: 1 });
  if (!outcome) throw new Error('résultat absent');
  return { result: outcome.result, calls };
}

function expectResult(
  result: CheckResult,
  status: CheckResult['status'],
  key: string,
): void {
  expect(result.status, key).toBe(status);
  expect(result.messageKey).toBe(key);
  seen.add(key);
  const template = fr[key as MessageKey];
  expect(template).toBeTruthy();
  const issues = lintText(template, 'apps/web/src/i18n/fr.ts');
  expect(failureCount(issues), template).toBe(0);
  expect(
    issues.filter((issue) => issue.rule === 'sentence-length'),
    template,
  ).toEqual([]);
  for (const name of template.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
    expect(result.params?.[name[1] ?? ''], key).toBeDefined();
  }
  if (status === 'warn' || status === 'fail') {
    expect(result.fixKey).toMatch(/^dns_email\./);
  } else expect(result.fixKey).toBeUndefined();
  if (status === 'na' || status === 'untested') expect(result.reason).toBe(key);
}

describe('registre DNS et e-mail', () => {
  it('expose huit checks passifs, dans l’ordre des identifiants', () => {
    expect(DNS_EMAIL_CHECKS.map((item) => item.id)).toEqual([
      'dns_email.caa',
      'dns_email.dkim',
      'dns_email.dmarc',
      'dns_email.dnssec',
      'dns_email.mta_sts',
      'dns_email.mx',
      'dns_email.spf',
      'dns_email.tls_rpt',
    ]);
    expect(DKIM_SELECTORS).toEqual([
      'default',
      'google',
      'selector1',
      'selector2',
      'k1',
      'mail',
      's1',
      's2',
      'dkim',
    ]);
    const registry = createRegistry(DNS_EMAIL_CHECKS);
    expect(
      registry.list({ domain: 'dns_email', mode: 'passive' }),
    ).toHaveLength(8);
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    for (const item of DNS_EMAIL_CHECKS) {
      expect(item.domain).toBe('dns_email');
      expect(item.mode).toBe('passive');
      expect(item.needs).toContain('dns');
    }
    expect(check('dns_email.mta_sts').needs).toEqual(['dns', 'http']);
  });

  it('ne sort pas du réseau autrement que par ctx.net', () => {
    const dir = fileURLToPath(new URL('../checks/dns_email/', import.meta.url));
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /node:https|node:http|globalThis\.fetch|createDohResolver|createSafeFetch/,
    );
  });
});

describe('site conforme', () => {
  it('réussit chaque test et ne relit pas le MX', async () => {
    const { ctx, calls } = harness();
    const outcomes = await runChecks(DNS_EMAIL_CHECKS, ctx);
    expect(outcomes.map((item) => [item.checkId, item.result.status])).toEqual(
      DNS_EMAIL_CHECKS.map((item) => [item.id, 'pass']),
    );
    for (const outcome of outcomes) {
      expectResult(outcome.result, 'pass', outcome.result.messageKey);
    }
    expect(calls.filter((item) => item === 'MX exemple.test')).toHaveLength(1);
    expect(calls.filter((item) => item.startsWith('GET '))).toEqual([
      'GET https://mta-sts.exemple.test/.well-known/mta-sts.txt',
    ]);
    expect(calls.filter((item) => item.includes('._domainkey.'))).toHaveLength(
      DKIM_SELECTORS.length,
    );
    const spf = outcomes.find((item) => item.checkId === 'dns_email.spf');
    expect(spf?.result.measured).toMatchObject({ lookups: 0, all: '-' });
    const dmarc = outcomes.find((item) => item.checkId === 'dns_email.dmarc');
    expect(dmarc?.result.measured).toMatchObject({ p: 'reject', pct: 100 });
    expect(dmarc?.result.messageKey).toBe('dns_email.dmarc.pass');
    const dkim = outcomes.find((item) => item.checkId === 'dns_email.dkim');
    expect(dkim?.result.params).toMatchObject({ selectors: 'google' });
  });

  it('retire www et reste applicable hors github.io', async () => {
    const { result, calls } = await run('dns_email.mx', {
      target: 'https://www.exemple.test/blog',
      scope: 'path',
      hosting: 'github_pages',
    });
    expectResult(result, 'pass', 'dns_email.mx.pass');
    expect(calls).toContain('MX exemple.test');
    expect(calls.some((item) => item.includes('www.'))).toBe(false);
  });
});

describe('portée github.io et adresse IP', () => {
  it('rend le domaine non applicable, sans aucune requête', async () => {
    const { ctx, calls } = harness({
      target: 'https://SoloPaps.GitHub.io/Projet-Site-Artiste/',
      scope: 'path',
      hosting: 'github_pages',
    });
    const outcomes = await runChecks(DNS_EMAIL_CHECKS, ctx);
    expect(outcomes.every((item) => item.result.status === 'na')).toBe(true);
    expect(
      outcomes.every(
        (item) => item.result.messageKey === 'dns_email.na_github',
      ),
    ).toBe(true);
    const first = outcomes[0];
    if (!first) throw new Error('résultat absent');
    expectResult(first.result, 'na', 'dns_email.na_github');
    expect(calls).toEqual([]);
    expect(scoreDomain('dns_email', outcomes)).toMatchObject({
      score: null,
      totalWeight: 0,
      level: 'untested',
    });
  });

  it('ignore une adresse IP', async () => {
    const v4 = await run('dns_email.spf', { target: 'https://192.0.2.10/' });
    expectResult(v4.result, 'na', 'dns_email.na_address');
    expect(v4.calls).toEqual([]);
    const v6 = await run('dns_email.mx', {
      target: 'https://[2001:db8::1]/',
    });
    expectResult(v6.result, 'na', 'dns_email.na_address');
  });
});

describe('MX', () => {
  it('reconnaît le refus explicite et l’absence', async () => {
    expectResult(
      (
        await run('dns_email.mx', {
          zone: merge({ 'exemple.test': { MX: ['0 .'] } }),
        })
      ).result,
      'pass',
      'dns_email.mx.pass_null',
    );
    expectResult(
      (
        await run('dns_email.mx', {
          zone: merge({ 'exemple.test': { MX: [] } }),
        })
      ).result,
      'warn',
      'dns_email.mx.warn_absent',
    );
  });

  it('refuse un mélange ou une ligne illisible', async () => {
    expectResult(
      (
        await run('dns_email.mx', {
          zone: merge({
            'exemple.test': { MX: ['0 .', '10 mail.exemple.test.'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.mx.fail_mix',
    );
    expectResult(
      (
        await run('dns_email.mx', {
          zone: merge({ 'exemple.test': { MX: ['mail'] } }),
        })
      ).result,
      'fail',
      'dns_email.mx.fail_syntax',
    );
  });
});

describe('SPF', () => {
  it('compte les renvois, le MX et ignore ce qui suit -all', async () => {
    const ten = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [
        `i${index}.exemple.test`,
        { TXT: ['v=spf1 -all'] },
      ]),
    );
    const includes = Array.from(
      { length: 10 },
      (_, index) => `include:i${index}.exemple.test`,
    ).join(' ');
    const under = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': { TXT: [`v=spf1 ${includes} -all`] },
        ...ten,
      }),
    });
    expectResult(under.result, 'pass', 'dns_email.spf.pass');
    expect(under.result.measured).toMatchObject({ lookups: 10 });

    const over = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': {
          TXT: [`v=spf1 ${includes} include:i10.exemple.test -all`],
        },
        ...ten,
      }),
    });
    expectResult(over.result, 'fail', 'dns_email.spf.fail_lookups');
    expect(over.result.params).toMatchObject({ lookups: 11 });

    const mx = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': {
          TXT: ['v=spf1 mx -all'],
          MX: [
            '10 a.exemple.test.',
            '10 b.exemple.test.',
            '20 c.exemple.test.',
          ],
        },
      }),
    });
    expect(mx.result.status).toBe('pass');
    expect(mx.result.measured).toMatchObject({ lookups: 4 });

    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { TXT: ['v=spf1 ip6:2001:db8::10 -all'] },
          }),
        })
      ).result,
      'pass',
      'dns_email.spf.pass',
    );

    const stopped = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': {
          TXT: ['v=spf1 -all redirect=z.exemple.test'],
        },
      }),
    });
    expectResult(stopped.result, 'pass', 'dns_email.spf.pass_refuse');
    expect(stopped.calls.some((item) => item.includes('z.exemple.test'))).toBe(
      false,
    );
  });

  it('signale les annonces faibles, vides ou contradictoires', async () => {
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { TXT: [] } }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_missing',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': {
              TXT: ['v=spf1 -all', 'v=spf1 ip4:192.0.2.1 -all'],
            },
          }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_multiple',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { TXT: ['v=spf1 include: -all'] } }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_syntax',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { TXT: ['v=spf1 +all'] } }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_plus',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { TXT: ['v=spf1 ip4:192.0.2.1 ~all'] },
          }),
        })
      ).result,
      'warn',
      'dns_email.spf.warn_soft',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { TXT: ['v=spf1 ip4:192.0.2.1'] } }),
        })
      ).result,
      'warn',
      'dns_email.spf.warn_neutral',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { TXT: ['v=spf1 ip4:192.0.2.1 ?all'] },
          }),
        })
      ).result,
      'warn',
      'dns_email.spf.warn_neutral',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { TXT: ['v=spf1 ptr -all'] } }),
        })
      ).result,
      'warn',
      'dns_email.spf.warn_ptr',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { TXT: ['v=spf1 include:%{d} -all'] },
          }),
        })
      ).result,
      'warn',
      'dns_email.spf.warn_macro',
    );
  });

  it('limite les consultations vides et les boucles', async () => {
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': {
              TXT: [
                'v=spf1 include:a.exemple.test include:b.exemple.test include:c.exemple.test -all',
              ],
            },
          }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_void',
    );
    const two = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': {
          TXT: ['v=spf1 include:a.exemple.test include:b.exemple.test -all'],
        },
      }),
    });
    expect(two.result.status).toBe('pass');
    expect(two.result.measured).toMatchObject({ lookups: 2 });
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { TXT: ['v=spf1 include:exemple.test -all'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_loop',
    );
  });

  it('suit un redirect et exige -all sans courrier', async () => {
    const redirected = await run('dns_email.spf', {
      zone: merge({
        'exemple.test': { TXT: ['v=spf1 redirect=_spf.exemple.test'] },
        '_spf.exemple.test': { TXT: ['v=spf1 ip4:192.0.2.10 -all'] },
      }),
    });
    expect(redirected.result.status).toBe('pass');
    expect(redirected.result.measured).toMatchObject({ lookups: 1, all: '-' });

    const refused = merge({
      'exemple.test': { MX: ['0 .'], TXT: ['v=spf1 -all'] },
    });
    expectResult(
      (await run('dns_email.spf', { zone: refused })).result,
      'pass',
      'dns_email.spf.pass_refuse',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({ 'exemple.test': { MX: ['0 .'], TXT: [] } }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_open',
    );
    expectResult(
      (
        await run('dns_email.spf', {
          zone: merge({
            'exemple.test': { MX: ['0 .'], TXT: ['v=spf1 ?all'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.spf.fail_open',
    );
  });
});

describe('DMARC', () => {
  it('juge la politique, le pourcentage et le rapport', async () => {
    const zone = goodZone();
    delete zone['_dmarc.exemple.test'];
    expectResult(
      (await run('dns_email.dmarc', { zone })).result,
      'fail',
      'dns_email.dmarc.fail_missing',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            '_dmarc.exemple.test': {
              TXT: [
                'v=DMARC1; p=reject; rua=mailto:a@exemple.test',
                'v=DMARC1; p=none',
              ],
            },
          }),
        })
      ).result,
      'fail',
      'dns_email.dmarc.fail_multiple',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            '_dmarc.exemple.test': { TXT: ['v=DMARC1; pct=100'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.dmarc.fail_syntax',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            '_dmarc.exemple.test': {
              TXT: ['v=DMARC1; p=none; pct=100; rua=mailto:a@exemple.test'],
            },
          }),
        })
      ).result,
      'warn',
      'dns_email.dmarc.warn_none',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            '_dmarc.exemple.test': {
              TXT: [
                'v=DMARC1; p=quarantine; pct=100; rua=mailto:a@exemple.test',
              ],
            },
          }),
        })
      ).result,
      'warn',
      'dns_email.dmarc.warn_quarantine',
    );
    const partial = await run('dns_email.dmarc', {
      zone: merge({
        '_dmarc.exemple.test': {
          TXT: ['v=DMARC1; p=reject; pct=40; rua=mailto:a@exemple.test'],
        },
      }),
    });
    expectResult(partial.result, 'warn', 'dns_email.dmarc.warn_pct');
    expect(partial.result.params).toMatchObject({ pct: 40 });
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            '_dmarc.exemple.test': { TXT: ['v=DMARC1; p=reject'] },
          }),
        })
      ).result,
      'warn',
      'dns_email.dmarc.warn_rua',
    );
    const implied = await run('dns_email.dmarc', {
      zone: merge({
        '_dmarc.exemple.test': {
          TXT: ['v=DMARC1; p=reject; rua=mailto:a@exemple.test'],
        },
      }),
    });
    expect(implied.result.status).toBe('pass');
    expect(implied.result.measured).toMatchObject({ pct: 100 });
  });

  it('exige le refus quand le nom n’envoie pas de courrier', async () => {
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            'exemple.test': { MX: ['0 .'] },
            '_dmarc.exemple.test': { TXT: [] },
          }),
        })
      ).result,
      'fail',
      'dns_email.dmarc.fail_spoof',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            'exemple.test': { MX: ['0 .'] },
            '_dmarc.exemple.test': { TXT: ['v=DMARC1; p=none'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.dmarc.fail_not_reject',
    );
    expectResult(
      (
        await run('dns_email.dmarc', {
          zone: merge({
            'exemple.test': { MX: ['0 .'] },
            '_dmarc.exemple.test': { TXT: ['v=DMARC1; p=reject'] },
          }),
        })
      ).result,
      'pass',
      'dns_email.dmarc.pass_reject',
    );
  });
});

describe('DKIM', () => {
  it('signale l’absence, une clé vide, ou l’inutilité sans courrier', async () => {
    const zone = goodZone();
    delete zone['google._domainkey.exemple.test'];
    expectResult(
      (await run('dns_email.dkim', { zone })).result,
      'warn',
      'dns_email.dkim.warn_missing',
    );
    expectResult(
      (
        await run('dns_email.dkim', {
          zone: {
            ...zone,
            'default._domainkey.exemple.test': { TXT: ['v=DKIM1; p='] },
          },
        })
      ).result,
      'warn',
      'dns_email.dkim.warn_invalid',
    );
    expectResult(
      (
        await run('dns_email.dkim', {
          zone: merge({ 'exemple.test': { MX: ['0 .'] } }),
        })
      ).result,
      'na',
      'dns_email.dkim.na_nomail',
    );
  });

  it('cite les sélecteurs trouvés dans l’ordre prévu', async () => {
    const { result, calls } = await run('dns_email.dkim', {
      zone: merge({
        'selector1._domainkey.exemple.test': {
          TXT: [`v=DKIM1; k=rsa; p=${KEY}`],
        },
      }),
    });
    expect(result.params).toMatchObject({ selectors: 'google, selector1' });
    expect(calls.filter((item) => item.includes('._domainkey.'))).toHaveLength(
      DKIM_SELECTORS.length,
    );
  });
});

describe('CAA et DNSSEC', () => {
  it('couvre la liste d’organismes', async () => {
    expectResult(
      (
        await run('dns_email.caa', {
          zone: merge({ 'exemple.test': { CAA: [] } }),
        })
      ).result,
      'warn',
      'dns_email.caa.warn_missing',
    );
    expectResult(
      (
        await run('dns_email.caa', {
          zone: merge({
            'exemple.test': { CAA: ['0 issuewild "letsencrypt.org"'] },
          }),
        })
      ).result,
      'warn',
      'dns_email.caa.warn_missing',
    );
    expectResult(
      (
        await run('dns_email.caa', {
          zone: merge({ 'exemple.test': { CAA: ['nope'] } }),
        })
      ).result,
      'fail',
      'dns_email.caa.fail_syntax',
    );
    expectResult(
      (
        await run('dns_email.caa', {
          zone: merge({ 'exemple.test': { CAA: ['128 foobar "x"'] } }),
        })
      ).result,
      'fail',
      'dns_email.caa.fail_critical',
    );
    expectResult(
      (
        await run('dns_email.caa', {
          zone: merge({ 'exemple.test': { CAA: ['0 issue ";"'] } }),
        })
      ).result,
      'pass',
      'dns_email.caa.pass_none',
    );
  });

  it('lit le drapeau AD et une panne DNS', async () => {
    expectResult(
      (
        await run('dns_email.dnssec', {
          zone: merge({ 'exemple.test': { ad: false } }),
        })
      ).result,
      'fail',
      'dns_email.dnssec.fail',
    );
    expectResult(
      (
        await run('dns_email.dnssec', {
          zone: merge({ 'exemple.test': { SOA: 'servfail' } }),
        })
      ).result,
      'untested',
      'dns_email.untested',
    );
    const down = await run('dns_email.spf', { dnsError: true });
    expectResult(down.result, 'untested', 'dns_email.untested');
  });
});

describe('MTA-STS et TLS-RPT', () => {
  it('juge l’annonce et le fichier de règle', async () => {
    expectResult(
      (
        await run('dns_email.mta_sts', {
          zone: merge({ '_mta-sts.exemple.test': { TXT: [] } }),
        })
      ).result,
      'warn',
      'dns_email.mta_sts.warn_missing',
    );
    expectResult(
      (
        await run('dns_email.mta_sts', {
          zone: merge({ '_mta-sts.exemple.test': { TXT: ['v=STSv1'] } }),
        })
      ).result,
      'fail',
      'dns_email.mta_sts.fail_syntax',
    );
    expectResult(
      (
        await run('dns_email.mta_sts', {
          policy: { status: 404, body: '' },
        })
      ).result,
      'fail',
      'dns_email.mta_sts.fail_policy',
    );
    expectResult(
      (
        await run('dns_email.mta_sts', {
          policy: {
            status: 200,
            body: 'version: STSv1\nmode: testing\nmx: mail.exemple.test\nmax_age: 86400\n',
          },
        })
      ).result,
      'warn',
      'dns_email.mta_sts.warn_testing',
    );
    expectResult(
      (
        await run('dns_email.mta_sts', {
          policy: {
            status: 200,
            body: 'version: STSv1\nmode: none\nmx: mail.exemple.test\nmax_age: 86400\n',
          },
        })
      ).result,
      'warn',
      'dns_email.mta_sts.warn_none',
    );
    expectResult(
      (await run('dns_email.mta_sts', { policy: 'error' })).result,
      'untested',
      'dns_email.mta_sts.untested',
    );
    expectResult(
      (
        await run('dns_email.mta_sts', {
          policy: { status: 503, body: '' },
        })
      ).result,
      'untested',
      'dns_email.mta_sts.untested',
    );
    const quiet = await run('dns_email.mta_sts', {
      zone: merge({ 'exemple.test': { MX: ['0 .'] } }),
    });
    expectResult(quiet.result, 'na', 'dns_email.mta_sts.na_nomail');
    expect(quiet.calls.some((item) => item.startsWith('GET '))).toBe(false);
  });

  it('juge le rapport TLS', async () => {
    expectResult(
      (
        await run('dns_email.tls_rpt', {
          zone: merge({ '_smtp._tls.exemple.test': { TXT: [] } }),
        })
      ).result,
      'warn',
      'dns_email.tls_rpt.warn_missing',
    );
    expectResult(
      (
        await run('dns_email.tls_rpt', {
          zone: merge({
            '_smtp._tls.exemple.test': { TXT: ['v=TLSRPTv1'] },
          }),
        })
      ).result,
      'fail',
      'dns_email.tls_rpt.fail_syntax',
    );
    expectResult(
      (
        await run('dns_email.tls_rpt', {
          zone: merge({ 'exemple.test': { MX: [] } }),
        })
      ).result,
      'na',
      'dns_email.tls_rpt.na_nomail',
    );
  });
});

describe('textes, fiches et méthode', () => {
  it('chaque clé DNS est produite par un test', () => {
    const keys = Object.keys(fr).filter((key) => key.startsWith('dns_email.'));
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('chaque check a une fiche netlify, github_pages et generic', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    for (const item of DNS_EMAIL_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
      expect(sheet.variants.generic).toContain('```');
      expect(
        sheet.why.split(/[.!?…]+/).filter((part) => part.trim() !== ''),
      ).toHaveLength(1);
      for (const text of [
        sheet.title,
        sheet.why,
        ...Object.values(sheet.variants),
      ]) {
        const prose = text.replace(/```[\s\S]*?```/g, ' ');
        const issues = lintText(prose, `${item.id}.md`);
        expect(failureCount(issues), prose).toBe(0);
        expect(
          issues.filter((issue) => issue.rule === 'sentence-length'),
          prose,
        ).toEqual([]);
      }
    }
  });

  it('la grille est écrite dans la méthode, avec les poids', () => {
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/produit/METHODE.md', import.meta.url)),
      'utf8',
    );
    expect(methode).toContain('github.io');
    expect(methode).toContain('Non applicable');
    expect(methode).toContain('10 consultations');
    for (const item of DNS_EMAIL_CHECKS) {
      expect(methode).toContain(`| ${item.id} | ${item.weight} |`);
    }
  });
});
