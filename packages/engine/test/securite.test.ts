import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  type DohResolver,
  NetError,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
  type TlsProbeResult,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr, type MessageKey } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { SECURITE_CHECKS } from '../checks/securite/index.js';
import { scanMixed } from '../checks/securite/parse.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  type Check,
  type CheckResult,
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
} from '../src/index.js';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const ORIGIN = 'https://exemple.test';
const seen = new Set<string>();

const noDns: DohResolver = {
  query: () => Promise.reject(new Error('DNS non disponible en test')),
  addresses: () => Promise.reject(new Error('DNS non disponible en test')),
};

function page(init: {
  url?: string;
  status?: number;
  headers?: Record<string, string | string[]>;
  body?: string;
  redirects?: string[];
}): SafeResponse {
  const headers = new Headers();
  for (const [name, value] of Object.entries(init.headers ?? {})) {
    if (Array.isArray(value))
      for (const item of value) headers.append(name, item);
    else headers.append(name, value);
  }
  const body = init.body ?? '';
  return {
    url: init.url ?? `${ORIGIN}/`,
    status: init.status ?? 200,
    headers,
    body: new TextEncoder().encode(body),
    transferBytes: new TextEncoder().encode(body).length,
    ip: '93.184.216.34',
    redirects: init.redirects ?? [],
    text: () => body,
  };
}

function tls(
  patch: {
    probe?: Partial<Omit<TlsProbeResult, 'certificate'>>;
    certificate?: Partial<TlsProbeResult['certificate']>;
  } = {},
): TlsProbeResult {
  return {
    host: 'exemple.test',
    ip: '93.184.216.34',
    port: 443,
    protocol: 'TLSv1.3',
    cipher: 'TLS_AES_128_GCM_SHA256',
    authorized: true,
    authorizationError: null,
    hostnameMatches: true,
    chain: [],
    ...patch.probe,
    certificate: {
      subject: 'CN=exemple.test',
      issuer: 'CN=Test',
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2027-01-01T00:00:00.000Z',
      daysRemaining: 70,
      expired: false,
      notYetValid: false,
      san: ['DNS:exemple.test'],
      fingerprint256: 'AA',
      ...patch.certificate,
    },
  };
}

function context(options: {
  target?: string;
  fetch?: SafeFetch;
  tls?: TlsProbe;
  pages?: Record<string, SafeResponse>;
}): RunContext {
  const pages = options.pages ?? {};
  const fetch: SafeFetch =
    options.fetch ??
    (async (input) => {
      const url = new URL(String(input));
      const key = `${url.protocol}//${url.host}${url.pathname}`;
      const found = pages[key];
      if (!found) throw new Error(`fetch inattendu ${key}`);
      return found;
    });
  return {
    target: {
      url: new URL(options.target ?? `${ORIGIN}/`),
      scope: 'origin',
      hosting: 'other',
    },
    verified: false,
    net: { fetch, dns: noDns, tls: options.tls ?? (async () => tls()) },
    shared: createSharedArtifacts(),
    budget: createRequestBudget({ perHostIntervalMs: 0 }),
    now: () => NOW,
  };
}

async function run(check: Check, ctx: RunContext): Promise<CheckResult> {
  const [outcome] = await runChecks([check], ctx, { concurrency: 1 });
  if (!outcome) throw new Error('résultat absent');
  return outcome.result;
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
    expect(result.params?.[name[1] ?? '']).toBeDefined();
  }
  if (status === 'warn' || status === 'fail')
    expect(result.fixKey).toBeTruthy();
  else expect(result.fixKey).toBeUndefined();
}

const HTML =
  '<!doctype html><html lang="fr"><head><title>Bon</title></head><body><p>Bonjour</p></body></html>';
const GOOD_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'content-security-policy':
    "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const TXT = `Contact: mailto:contact@exemple.test
Expires: 2027-06-01T00:00:00.000Z
Canonical: ${ORIGIN}/.well-known/security.txt
`;

function goodPages(): Record<string, SafeResponse> {
  return {
    [`${ORIGIN}/`]: page({ headers: GOOD_HEADERS, body: HTML }),
    'http://exemple.test/': page({
      url: `${ORIGIN}/`,
      redirects: ['http://exemple.test/'],
      headers: GOOD_HEADERS,
      body: HTML,
    }),
    [`${ORIGIN}/.well-known/security.txt`]: page({
      url: `${ORIGIN}/.well-known/security.txt`,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: TXT,
    }),
  };
}

function home(
  headers: Record<string, string | string[]> = {},
  body = HTML,
  url = `${ORIGIN}/`,
): SafeResponse {
  return page({
    url,
    body,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

const byId = Object.fromEntries(
  SECURITE_CHECKS.map((check) => [check.id, check]),
);

function check(id: string): Check {
  const found = byId[id];
  if (!found) throw new Error(id);
  return found;
}

describe('registre sécurité passive', () => {
  it('expose onze checks passifs, dans l’ordre des identifiants', () => {
    expect(SECURITE_CHECKS.map((item) => item.id)).toEqual([
      'securite.certificate',
      'securite.cookies',
      'securite.csp',
      'securite.frames',
      'securite.hsts',
      'securite.https',
      'securite.mixed',
      'securite.permissions',
      'securite.referrer',
      'securite.security_txt',
      'securite.xcto',
    ]);
    const registry = createRegistry(SECURITE_CHECKS);
    expect(registry.list({ domain: 'securite', mode: 'passive' })).toHaveLength(
      11,
    );
    expect(registry.list({ mode: 'active' })).toHaveLength(0);
    for (const item of SECURITE_CHECKS) {
      expect(item.domain).toBe('securite');
      expect(
        item.needs.every((need) => need === 'http' || need === 'tls'),
      ).toBe(true);
    }
  });

  it('ne sort pas du réseau autrement que par ctx.net', () => {
    const dir = fileURLToPath(new URL('../checks/securite/', import.meta.url));
    const source = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /node:http|node:https|globalThis\.fetch|createSafeFetch|createTlsProbe/,
    );
  });
});

describe('site conforme et site en échec', () => {
  it('un site bien réglé réussit chaque test', async () => {
    const outcomes = await runChecks(
      SECURITE_CHECKS,
      context({ pages: goodPages(), tls: async () => tls() }),
    );
    expect(outcomes.map((item) => [item.checkId, item.result.status])).toEqual(
      SECURITE_CHECKS.map((item) => [item.id, 'pass']),
    );
    for (const outcome of outcomes) seen.add(outcome.result.messageKey);
  });

  it('ne charge la page d’accueil qu’une fois', async () => {
    const calls: string[] = [];
    let probes = 0;
    const pages = goodPages();
    await runChecks(
      SECURITE_CHECKS,
      context({
        fetch: async (input) => {
          const url = new URL(String(input));
          const key = `${url.protocol}//${url.host}${url.pathname}`;
          calls.push(key);
          const found = pages[key];
          if (!found) throw new Error(key);
          return found;
        },
        tls: async () => {
          probes += 1;
          return tls();
        },
      }),
    );
    expect(calls.filter((item) => item === `${ORIGIN}/`)).toHaveLength(1);
    expect(
      calls.filter((item) => item === 'http://exemple.test/'),
    ).toHaveLength(1);
    expect(
      calls.filter((item) => item === `${ORIGIN}/.well-known/security.txt`),
    ).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(probes).toBe(1);
  });

  it('un site sans protection échoue les contrôles indispensables', async () => {
    const bad = home(
      {},
      '<html><script src="http://cdn.test/a.js"></script></html>',
      'http://exemple.test/',
    );
    bad.headers.append('set-cookie', 'sid=1');
    const pages: Record<string, SafeResponse> = {
      'http://exemple.test/': bad,
      [`${ORIGIN}/.well-known/security.txt`]: page({
        url: `${ORIGIN}/.well-known/security.txt`,
        status: 404,
      }),
      [`${ORIGIN}/security.txt`]: page({
        url: `${ORIGIN}/security.txt`,
        status: 404,
      }),
    };
    const outcomes = await runChecks(
      SECURITE_CHECKS,
      context({
        target: 'http://exemple.test/',
        pages,
        tls: async () =>
          tls({ certificate: { expired: true, daysRemaining: -2 } }),
      }),
    );
    const status = Object.fromEntries(
      outcomes.map((item) => [item.checkId, item.result.status]),
    );
    expect(status).toMatchObject({
      'securite.https': 'fail',
      'securite.hsts': 'fail',
      'securite.csp': 'fail',
      'securite.xcto': 'warn',
      'securite.frames': 'fail',
      'securite.referrer': 'pass',
      'securite.permissions': 'warn',
      'securite.cookies': 'fail',
      'securite.certificate': 'fail',
      'securite.mixed': 'na',
      'securite.security_txt': 'fail',
    });
    for (const outcome of outcomes) seen.add(outcome.result.messageKey);
  });
});

describe('sécurité.https', () => {
  const id = 'securite.https';

  it('réussit quand l’adresse non chiffrée ne répond pas', async () => {
    const result = await run(
      check(id),
      context({
        fetch: async (input) => {
          const url = new URL(String(input));
          if (url.protocol === 'http:') throw new NetError('NETWORK', 'refus');
          return home();
        },
      }),
    );
    expectResult(result, 'pass', 'securite.https.pass_no_http');
  });

  it('signale un changement de nom', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home(),
          'http://exemple.test/': page({
            url: 'https://www.exemple.test/',
            redirects: ['http://exemple.test/'],
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.https.warn_off_host');
  });

  it('signale une première étape encore non chiffrée', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home(),
          'http://exemple.test/': page({
            url: `${ORIGIN}/accueil`,
            redirects: ['http://exemple.test/', 'http://exemple.test/accueil'],
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.https.warn_delayed');
  });

  it('échoue si l’adresse finale reste non chiffrée', async () => {
    const result = await run(
      check(id),
      context({
        target: 'http://exemple.test/',
        pages: {
          'http://exemple.test/': page({
            url: 'http://exemple.test/',
            headers: { 'content-type': 'text/html' },
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.https.fail');
  });

  it('échoue si les redirections tournent en boucle', async () => {
    const result = await run(
      check(id),
      context({
        fetch: async (input) => {
          const url = new URL(String(input));
          if (url.protocol === 'http:')
            throw new NetError('TOO_MANY_REDIRECTS', 'boucle');
          return home();
        },
      }),
    );
    expectResult(result, 'fail', 'securite.https.fail');
  });
});

describe('sécurité.hsts', () => {
  const id = 'securite.hsts';

  it('réussit à partir de six mois, sans includeSubDomains', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'strict-transport-security': 'max-age=15768000',
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.hsts.pass');
  });

  it('améliore si la durée est plus courte', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'strict-transport-security': 'max-age=15767999',
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.hsts.warn_short');
  });

  it('échoue si l’en-tête est absent', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'fail', 'securite.hsts.fail_missing');
  });

  it('échoue si max-age vaut 0', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({ 'strict-transport-security': 'max-age=0' }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.hsts.fail_missing');
    expect(result.measured).toMatchObject({ maxAge: 0 });
  });

  it('échoue si l’en-tête est illisible', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({ 'strict-transport-security': 'max-age=abc' }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.hsts.fail_invalid');
  });

  it('échoue hors adresse chiffrée', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: page({
            url: 'http://exemple.test/',
            headers: { 'strict-transport-security': 'max-age=63072000' },
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.hsts.fail_no_https');
  });
});

describe('sécurité.csp', () => {
  const id = 'securite.csp';
  const base = "default-src 'none'; object-src 'none'";

  it('échoue sans politique', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'fail', 'securite.csp.fail_missing');
  });

  it('échoue si la politique est illisible', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': "script-src 'self'; script-src 'none'",
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.csp.fail_invalid');
  });

  it('échoue si les scripts sont trop ouverts', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': `${base}; script-src 'unsafe-inline'`,
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.csp.fail_unsafe');
  });

  it('réussit quand un jeton neutralise unsafe-inline', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': `${base}; script-src 'nonce-abc' 'unsafe-inline'`,
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.csp.pass');
  });

  it('améliore si seul unsafe-eval est présent', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': `${base}; script-src 'self' 'unsafe-eval'`,
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.csp.warn_loose');
  });

  it('améliore si les images viennent en http', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy':
              "default-src 'self'; script-src 'self'; object-src 'none'; img-src http:",
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.csp.warn_loose');
  });

  it('réussit avec unsafe-inline limité aux styles', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': `${base}; script-src 'self'; style-src 'unsafe-inline'`,
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.csp.pass');
    expect(result.measured).toMatchObject({ styleLoose: true });
  });

  it('échoue si les attributs de script restent ouverts', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': `${base}; script-src 'self'; script-src-attr 'unsafe-inline'`,
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.csp.fail_unsafe');
  });
});

describe('sécurité.xcto', () => {
  const id = 'securite.xcto';

  it('réussit avec nosniff', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({ 'x-content-type-options': 'nosniff' }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.xcto.pass');
  });

  it('améliore si l’en-tête manque', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'warn', 'securite.xcto.warn_missing');
  });

  it('échoue si la valeur est autre', async () => {
    const result = await run(
      check(id),
      context({
        pages: { [`${ORIGIN}/`]: home({ 'x-content-type-options': 'sniff' }) },
      }),
    );
    expectResult(result, 'fail', 'securite.xcto.fail');
  });
});

describe('sécurité.frames', () => {
  const id = 'securite.frames';

  it('réussit avec frame-ancestors', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': "frame-ancestors 'self'",
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.frames.pass');
  });

  it('réussit avec l’en-tête de cadre ancien', async () => {
    const result = await run(
      check(id),
      context({
        pages: { [`${ORIGIN}/`]: home({ 'x-frame-options': 'SAMEORIGIN' }) },
      }),
    );
    expectResult(result, 'pass', 'securite.frames.pass');
  });

  it('échoue sans protection', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'fail', 'securite.frames.fail');
  });

  it('améliore avec l’ancienne forme allow-from', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'x-frame-options': 'ALLOW-FROM https://ami.test',
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.frames.warn_obsolete');
  });

  it('échoue si frame-ancestors ouvre tout, même avec un autre en-tête', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'content-security-policy': 'frame-ancestors *',
            'x-frame-options': 'DENY',
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.frames.fail');
  });
});

describe('sécurité.referrer', () => {
  const id = 'securite.referrer';

  it('réussit sans en-tête', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'pass', 'securite.referrer.pass_absent');
  });

  it('réussit avec une politique stricte, même après une valeur large', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'referrer-policy': 'unsafe-url, strict-origin-when-cross-origin',
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.referrer.pass');
  });

  it('améliore l’ancienne valeur par défaut', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'referrer-policy': 'no-referrer-when-downgrade',
          }),
        },
      }),
    );
    expectResult(result, 'warn', 'securite.referrer.warn_legacy');
  });

  it('améliore une politique qui envoie trop', async () => {
    const result = await run(
      check(id),
      context({
        pages: { [`${ORIGIN}/`]: home({ 'referrer-policy': 'unsafe-url' }) },
      }),
    );
    expectResult(result, 'warn', 'securite.referrer.warn_unsafe');
  });

  it('échoue si aucune valeur n’est reconnue', async () => {
    const result = await run(
      check(id),
      context({
        pages: { [`${ORIGIN}/`]: home({ 'referrer-policy': 'parfois' }) },
      }),
    );
    expectResult(result, 'fail', 'securite.referrer.fail_invalid');
  });
});

describe('sécurité.permissions', () => {
  const id = 'securite.permissions';

  it('réussit quand caméra, micro et position sont fermés', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'permissions-policy':
              'camera=(), microphone=(), geolocation=(self)',
          }),
        },
      }),
    );
    expectResult(result, 'pass', 'securite.permissions.pass');
  });

  it('améliore si l’en-tête manque', async () => {
    const result = await run(
      check(id),
      context({ pages: { [`${ORIGIN}/`]: home() } }),
    );
    expectResult(result, 'warn', 'securite.permissions.warn_missing');
  });

  it('échoue si une fonction est ouverte à tous', async () => {
    const result = await run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/`]: home({
            'permissions-policy': 'camera=*, microphone=(), geolocation=()',
          }),
        },
      }),
    );
    expectResult(result, 'fail', 'securite.permissions.fail_open');
  });

  it('échoue si la syntaxe est cassée', async () => {
    const result = await run(
      check(id),
      context({
        pages: { [`${ORIGIN}/`]: home({ 'permissions-policy': 'camera=(' }) },
      }),
    );
    expectResult(result, 'fail', 'securite.permissions.fail_invalid');
  });
});

describe('sécurité.cookies', () => {
  const id = 'securite.cookies';

  async function cookies(
    lines: string[],
    headers: Record<string, string> = {},
    url = `${ORIGIN}/`,
  ) {
    const response = home(headers, HTML, url);
    for (const line of lines) response.headers.append('set-cookie', line);
    return run(
      check(id),
      context({
        target: url,
        pages: { [`${new URL(url).origin}/`]: response },
      }),
    );
  }

  it('réussit sans trace', async () => {
    expectResult(await cookies([]), 'pass', 'securite.cookies.pass_none');
  });

  it('réussit avec Secure, HttpOnly et SameSite', async () => {
    expectResult(
      await cookies(['id=1; Secure; HttpOnly; SameSite=Lax; Max-Age=20']),
      'pass',
      'securite.cookies.pass',
    );
  });

  it('réussit sans SameSite quand le reste est verrouillé', async () => {
    expectResult(
      await cookies(['id=1; Secure; HttpOnly; Max-Age=20']),
      'pass',
      'securite.cookies.pass',
    );
  });

  it('réussit SameSite=None avec Secure', async () => {
    expectResult(
      await cookies(['id=1; Secure; HttpOnly; SameSite=None; Max-Age=20']),
      'pass',
      'securite.cookies.pass',
    );
  });

  it('échoue pour une session sans chiffrement', async () => {
    expectResult(
      await cookies(['sid=1; HttpOnly']),
      'fail',
      'securite.cookies.fail_session_secure',
    );
  });

  it('améliore si HSTS couvre l’absence de Secure', async () => {
    expectResult(
      await cookies(['sid=1; HttpOnly; SameSite=Lax'], {
        'strict-transport-security': 'max-age=15768000',
      }),
      'warn',
      'securite.cookies.warn_hsts',
    );
  });

  it('échoue pour une session lisible par la page', async () => {
    expectResult(
      await cookies(['sid=1; Secure; SameSite=Lax']),
      'fail',
      'securite.cookies.fail_session_httponly',
    );
  });

  it('échoue pour une trace durable sans Secure', async () => {
    expectResult(
      await cookies(['id=1; HttpOnly; Max-Age=20']),
      'fail',
      'securite.cookies.fail_secure',
    );
  });

  it('échoue si SameSite est inconnu', async () => {
    expectResult(
      await cookies(['id=1; Secure; HttpOnly; SameSite=Nope; Max-Age=20']),
      'fail',
      'securite.cookies.fail_samesite',
    );
  });

  it('échoue pour un jeton anti-CSRF sans SameSite', async () => {
    expectResult(
      await cookies(['csrf=1; Secure; HttpOnly; Max-Age=20']),
      'fail',
      'securite.cookies.fail_samesite',
    );
  });

  it('échoue si le préfixe __Host- est contredit', async () => {
    expectResult(
      await cookies([
        '__Host-id=1; Secure; HttpOnly; SameSite=Lax; Path=/blog',
      ]),
      'fail',
      'securite.cookies.fail_prefix',
    );
  });

  it('retient la trace la plus grave parmi plusieurs', async () => {
    const result = await cookies([
      'ok=1; Secure; HttpOnly; SameSite=Lax; Max-Age=20',
      'sid=1',
    ]);
    expectResult(result, 'fail', 'securite.cookies.fail_session_secure');
    expect(result.measured).toMatchObject({ count: 2 });
    expect(JSON.stringify(result.measured)).not.toContain('sid=1');
  });

  it('échoue aussi quand la page elle-même n’est pas chiffrée', async () => {
    expectResult(
      await cookies(['sid=1; Secure; HttpOnly'], {}, 'http://exemple.test/'),
      'fail',
      'securite.cookies.fail_session_secure',
    );
  });
});

describe('sécurité.certificate', () => {
  const id = 'securite.certificate';

  async function cert(patch: Parameters<typeof tls>[0]) {
    return run(check(id), context({ tls: async () => tls(patch) }));
  }

  it('réussit avec une chaîne valide et du temps devant', async () => {
    const result = await cert({});
    expectResult(result, 'pass', 'securite.certificate.pass');
    expect(result.params).toMatchObject({ jours: 70 });
  });

  it('échoue si le certificat est périmé', async () => {
    expectResult(
      await cert({ certificate: { expired: true, daysRemaining: -3 } }),
      'fail',
      'securite.certificate.fail_expired',
    );
  });

  it('échoue s’il n’est pas encore valable', async () => {
    expectResult(
      await cert({ certificate: { notYetValid: true, daysRemaining: 70 } }),
      'fail',
      'securite.certificate.fail_not_yet',
    );
  });

  it('échoue si le nom ne correspond pas', async () => {
    expectResult(
      await cert({ probe: { hostnameMatches: false } }),
      'fail',
      'securite.certificate.fail_hostname',
    );
  });

  it('échoue si la chaîne n’est pas reconnue', async () => {
    expectResult(
      await cert({
        probe: {
          authorized: false,
          authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        },
      }),
      'fail',
      'securite.certificate.fail_chain',
    );
  });

  it('améliore sous 30 jours', async () => {
    const result = await cert({ certificate: { daysRemaining: 10 } });
    expectResult(result, 'warn', 'securite.certificate.warn_soon');
    expect(result.params).toMatchObject({ jours: 10 });
  });

  it('améliore le jour même', async () => {
    expectResult(
      await cert({ certificate: { daysRemaining: 0 } }),
      'warn',
      'securite.certificate.warn_today',
    );
  });

  it('devient non testé si la sonde échoue', async () => {
    const result = await run(
      check(id),
      context({
        tls: async () => {
          throw new NetError('TLS_HANDSHAKE_FAILED', 'coupé');
        },
      }),
    );
    expect(result.status).toBe('untested');
    expect(result.reason).toBe('reason.error');
    expect(result.measured).toMatchObject({
      errorCode: 'TLS_HANDSHAKE_FAILED',
    });
  });
});

describe('sécurité.mixed', () => {
  const id = 'securite.mixed';

  async function mixed(
    body: string,
    headers: Record<string, string> = {},
    url = `${ORIGIN}/`,
  ) {
    return run(
      check(id),
      context({
        target: url,
        pages: {
          [`${new URL(url).origin}/`]: page({
            url,
            body,
            headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
          }),
        },
      }),
    );
  }

  it('réussit sans adresse non chiffrée', async () => {
    expectResult(
      await mixed(
        '<html><script src="https://cdn.test/a.js"></script><img src="/a.png"></html>',
      ),
      'pass',
      'securite.mixed.pass',
    );
  });

  it('échoue pour un script', async () => {
    expectResult(
      await mixed('<html><script src="http://cdn.test/a.js"></script></html>'),
      'fail',
      'securite.mixed.fail',
    );
  });

  it('échoue pour une police ou un import', async () => {
    expectResult(
      await mixed('<style>@font-face{src:url(http://cdn.test/a.woff)}</style>'),
      'fail',
      'securite.mixed.fail',
    );
    expectResult(
      await mixed('<style>@import "http://cdn.test/a.css";</style>'),
      'fail',
      'securite.mixed.fail',
    );
  });

  it('améliore pour une image seulement', async () => {
    expectResult(
      await mixed(
        '<img src="http://cdn.test/a.png" srcset="http://cdn.test/b.png 2x">',
      ),
      'warn',
      'securite.mixed.warn',
    );
  });

  it('ignore les commentaires et les liens de navigation', async () => {
    expectResult(
      await mixed(
        '<!-- <script src="http://cdn.test/a.js"></script> --><link rel="canonical" href="http://exemple.test/">',
      ),
      'pass',
      'securite.mixed.pass',
    );
  });

  it('ne s’applique pas hors chiffrement', async () => {
    expectResult(
      await mixed(
        '<script src="http://cdn.test/a.js"></script>',
        {},
        'http://exemple.test/',
      ),
      'na',
      'securite.mixed.na_http',
    );
  });

  it('ne s’applique pas hors HTML', async () => {
    expectResult(
      await mixed('{}', { 'content-type': 'application/json' }),
      'na',
      'securite.mixed.na_not_html',
    );
  });

  it('repère une balise base et une feuille de style', () => {
    expect(
      scanMixed(
        '<base href="http://cdn.test/"><link rel="stylesheet" href="http://cdn.test/a.css">',
      ).active,
    ).toHaveLength(2);
  });
});

describe('sécurité.security_txt', () => {
  const id = 'securite.security_txt';

  function txt(
    body: string,
    init: { status?: number; type?: string; path?: string } = {},
  ): SafeResponse {
    const path = init.path ?? '/.well-known/security.txt';
    return page({
      url: `${ORIGIN}${path}`,
      status: init.status ?? 200,
      body,
      headers: { 'content-type': init.type ?? 'text/plain; charset=utf-8' },
    });
  }

  async function files(primary: SafeResponse, legacy?: SafeResponse) {
    return run(
      check(id),
      context({
        pages: {
          [`${ORIGIN}/.well-known/security.txt`]: primary,
          [`${ORIGIN}/security.txt`]:
            legacy ?? page({ url: `${ORIGIN}/security.txt`, status: 404 }),
        },
      }),
    );
  }

  it('réussit un fichier complet', async () => {
    expectResult(await files(txt(TXT)), 'pass', 'securite.security_txt.pass');
  });

  it('réussit un fichier signé, sans vérifier la signature', async () => {
    const body = `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

Contact: mailto:contact@exemple.test
Expires: 2027-06-01T00:00:00.000Z
-----BEGIN PGP SIGNATURE-----
abc
-----END PGP SIGNATURE-----`;
    expectResult(await files(txt(body)), 'pass', 'securite.security_txt.pass');
  });

  it('échoue s’il est introuvable', async () => {
    expectResult(
      await files(
        txt('', { status: 404 }),
        page({ url: `${ORIGIN}/security.txt`, status: 404 }),
      ),
      'fail',
      'securite.security_txt.fail_missing',
    );
  });

  it('échoue s’il est périmé ou sans contact', async () => {
    expectResult(
      await files(
        txt(
          'Contact: mailto:contact@exemple.test\nExpires: 2020-01-01T00:00:00.000Z\n',
        ),
      ),
      'fail',
      'securite.security_txt.fail_invalid',
    );
    expectResult(
      await files(txt('Expires: 2027-06-01T00:00:00.000Z\n')),
      'fail',
      'securite.security_txt.fail_invalid',
    );
  });

  it('améliore quand l’échéance est proche', async () => {
    const soon = await files(
      txt(
        'Contact: mailto:contact@exemple.test\nExpires: 2026-10-30T00:00:00.000Z\n',
      ),
    );
    expectResult(soon, 'warn', 'securite.security_txt.warn_soon');
    expect(soon.params).toMatchObject({ jours: 6 });
    expectResult(
      await files(
        txt(
          'Contact: mailto:contact@exemple.test\nExpires: 2026-10-23T18:00:00.000Z\n',
        ),
      ),
      'warn',
      'securite.security_txt.warn_today',
    );
  });

  it('améliore l’ancienne adresse', async () => {
    expectResult(
      await files(
        txt('', { status: 404 }),
        txt(TXT, { path: '/security.txt' }),
      ),
      'warn',
      'securite.security_txt.warn_legacy',
    );
  });

  it('améliore un mauvais type ou un canonical différent', async () => {
    expectResult(
      await files(txt(TXT, { type: 'text/html' })),
      'warn',
      'securite.security_txt.warn_type',
    );
    expectResult(
      await files(
        txt(
          'Contact: mailto:contact@exemple.test\nExpires: 2027-06-01T00:00:00.000Z\nCanonical: https://autre.test/.well-known/security.txt\n',
        ),
      ),
      'warn',
      'securite.security_txt.warn_canonical',
    );
  });

  it('reste non testé si le fichier répond autre chose que 200 ou 404', async () => {
    const result = await files(txt('non', { status: 500 }));
    expectResult(result, 'untested', 'securite.security_txt.untested_status');
    expect(result.params).toMatchObject({ status: 500 });
  });
});

describe('textes, fiches et méthode', () => {
  it('chaque clé de sécurité est produite par un test', () => {
    const technologies =
      /^securite\.(technologies|cve_scripts|cve_logiciels|fichiers|listing|tls)\./;
    const keys = Object.keys(fr).filter(
      (key) => key.startsWith('securite.') && !technologies.test(key),
    );
    expect(keys.filter((key) => !seen.has(key)).sort()).toEqual([]);
  });

  it('chaque check a une fiche netlify, github_pages et generic', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    for (const item of SECURITE_CHECKS) {
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.netlify).toContain('_headers');
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
      expect(sheet.variants.generic.length).toBeGreaterThan(20);
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
      fileURLToPath(
        new URL('../../../docs/produit/METHODE.md', import.meta.url),
      ),
      'utf8',
    );
    expect(methode).toContain('HTTP Observatory');
    expect(methode).toContain('15768000');
    for (const item of SECURITE_CHECKS) {
      expect(methode).toContain(`| ${item.id} | ${item.weight} |`);
    }
  });
});
