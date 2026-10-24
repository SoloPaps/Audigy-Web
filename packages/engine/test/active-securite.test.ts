import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createRequestBudget,
  NetError,
  type SafeFetch,
  type SafeResponse,
  type TlsProbe,
  type TlsProbeResult,
} from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { fr } from '../../../apps/web/src/i18n/fr.js';
import { failureCount, lintText } from '../../../scripts/copy-lint.js';
import { ACTIVE_SECURITE_CHECKS } from '../checks/securite/active.js';
import { EXPOSED_FILES, LISTING_DIRS } from '../checks/securite/signatures.js';
import { FIXES_FR_DIR, fileFixStore } from '../src/fixes-fs.js';
import {
  createRegistry,
  createSharedArtifacts,
  loadFixes,
  type RunContext,
  runChecks,
} from '../src/index.js';

const SPA = readFileSync(
  fileURLToPath(
    new URL('../../../fixtures/sites/spa/index.html', import.meta.url),
  ),
);
const SPA_TEXT = new TextDecoder().decode(SPA);

function response(
  url: string,
  body: string | Uint8Array,
  status = 200,
  type = 'text/html; charset=utf-8',
): SafeResponse {
  const bytes =
    typeof body === 'string' ? new TextEncoder().encode(body) : body;
  const text = new TextDecoder().decode(bytes);
  return {
    url,
    status,
    headers: new Headers({ 'content-type': type }),
    body: bytes,
    transferBytes: bytes.byteLength,
    ip: '93.184.216.34',
    redirects: [],
    text: () => text,
  };
}

function context(options: {
  verified?: boolean;
  url?: string;
  scope?: 'origin' | 'path';
  fetch: SafeFetch;
  tls?: TlsProbe;
}): RunContext {
  const budget = createRequestBudget({
    perHostIntervalMs: 0,
    maxRequests: 80,
  });
  return {
    target: {
      url: new URL(options.url ?? 'https://exemple.test/'),
      scope: options.scope ?? 'origin',
      hosting: 'other',
    },
    verified: options.verified ?? true,
    net: {
      fetch: options.fetch,
      dns: {
        query: async () => {
          throw new Error('dns');
        },
        addresses: async () => [],
      },
      tls:
        options.tls ??
        (async () => {
          throw new NetError('TLS_HANDSHAKE_FAILED', 'non');
        }),
    },
    shared: createSharedArtifacts(),
    budget,
    now: () => new Date('2026-10-24T12:00:00.000Z'),
  };
}

function spaFetch(extra: Record<string, string | Uint8Array> = {}): {
  fetch: SafeFetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fetch: SafeFetch = async (input) => {
    const url = new URL(String(input));
    urls.push(url.href);
    const hit = extra[url.pathname];
    if (hit !== undefined) {
      const type = url.pathname.endsWith('.sql')
        ? 'application/sql'
        : 'text/plain; charset=utf-8';
      return response(url.href, hit, 200, type);
    }
    return response(url.href, SPA);
  };
  return { fetch, urls };
}

const tlsOk = {
  protocol: 'TLSv1.3',
  cipher: 'TLS_AES_128_GCM_SHA256',
  authorized: true,
  authorizationError: null,
  hostnameMatches: true,
  certificate: {
    subject: 'CN=exemple.test',
    issuer: 'CN=Exemple',
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    daysRemaining: 60,
    expired: false,
    notYetValid: false,
    san: ['DNS:exemple.test'],
    fingerprint256: 'aa',
  },
  chain: [],
  host: 'exemple.test',
  ip: '93.184.216.34',
  port: 443,
} satisfies TlsProbeResult;

describe('checks actifs', () => {
  it('en enregistre trois, hors du lot passif', () => {
    expect(EXPOSED_FILES.length).toBeGreaterThanOrEqual(30);
    expect(EXPOSED_FILES.length).toBeLessThanOrEqual(40);
    expect(LISTING_DIRS.length).toBeGreaterThan(0);
    const registry = createRegistry(ACTIVE_SECURITE_CHECKS);
    expect(registry.list({ mode: 'active' }).map((item) => item.id)).toEqual([
      'securite.fichiers',
      'securite.listing',
      'securite.tls',
    ]);
    expect(
      ACTIVE_SECURITE_CHECKS.map((item) => [item.id, item.weight]),
    ).toEqual([
      ['securite.fichiers', 3],
      ['securite.listing', 2],
      ['securite.tls', 2],
    ]);
  });

  it('ne lance pas l’actif si le site n’est pas vérifié', async () => {
    let calls = 0;
    const { fetch } = spaFetch();
    const wrapped: SafeFetch = async (input, init) => {
      calls += 1;
      return fetch(input, init);
    };
    const outcomes = await runChecks(
      ACTIVE_SECURITE_CHECKS,
      context({ verified: false, fetch: wrapped }),
    );
    expect(outcomes.map((item) => item.result.status)).toEqual([
      'untested',
      'untested',
      'untested',
    ]);
    expect(calls).toBe(0);
  });

  it('ne signale pas un site qui renvoie index.html pour tout chemin', async () => {
    expect(SPA_TEXT).toContain('PASSWORD=');
    const { fetch, urls } = spaFetch();
    const outcomes = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.needs.includes('http')),
      context({ fetch }),
    );
    const files = outcomes.find((item) => item.checkId === 'securite.fichiers');
    const listing = outcomes.find(
      (item) => item.checkId === 'securite.listing',
    );
    expect(files?.result.status).toBe('pass');
    expect(listing?.result.status).toBe('pass');
    expect(files?.result.measured).toMatchObject({ paths: [] });
    expect(urls.length).toBeGreaterThan(EXPOSED_FILES.length);
  });

  it('signale un fichier dont le contenu a la bonne signature', async () => {
    const { fetch } = spaFetch({
      '/.env': 'DATABASE_URL=postgres://local/app\n',
      '/backup.sql': 'CREATE TABLE notes (id int);\n',
    });
    const outcomes = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.fichiers'),
      context({ fetch }),
    );
    const result = outcomes[0]?.result;
    expect(result?.status).toBe('fail');
    expect(result?.messageKey).toBe('securite.fichiers.fail_many');
    expect(result?.measured).toMatchObject({
      paths: ['/.env', '/backup.sql'],
    });
    expect(JSON.stringify(result?.measured)).not.toContain('postgres');
  });

  it('reste sous le chemin vérifié', async () => {
    const { fetch, urls } = spaFetch();
    await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.fichiers'),
      context({
        fetch,
        url: 'https://solopaps.github.io/Projet-Site-Artiste/',
        scope: 'path',
      }),
    );
    expect(urls.every((url) => url.includes('/Projet-Site-Artiste/'))).toBe(
      true,
    );
    expect(urls.some((url) => url.endsWith('github.io/.git/HEAD'))).toBe(false);
    expect(
      urls.some((url) => url.endsWith('/Projet-Site-Artiste/.git/HEAD')),
    ).toBe(true);
  });

  it('reconnaît une liste de dossier, pas la page d’accueil', async () => {
    const { fetch } = spaFetch({
      '/uploads/':
        '<html><title>Index of /uploads/</title><a href="../">Parent</a></html>',
    });
    const outcomes = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.listing'),
      context({ fetch }),
    );
    expect(outcomes[0]?.result.status).toBe('fail');
    expect(outcomes[0]?.result.measured).toMatchObject({
      paths: ['/uploads/'],
    });
  });

  it('note les versions de chiffrement acceptées', async () => {
    const asked: string[] = [];
    const tls: TlsProbe = async (_host, call) => {
      const version = call?.maxVersion ?? '';
      asked.push(version);
      if (version === 'TLSv1' || version === 'TLSv1.1') {
        throw new NetError('TLS_HANDSHAKE_FAILED', 'refusé');
      }
      return { ...tlsOk, protocol: version };
    };
    const pass = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.tls'),
      context({ fetch: spaFetch().fetch, tls }),
    );
    expect(pass[0]?.result.status).toBe('pass');
    expect(asked).toEqual(['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3']);

    const legacy: TlsProbe = async (_host, call) => {
      if (call?.maxVersion === 'TLSv1.3') {
        throw new NetError('TLS_HANDSHAKE_FAILED', 'refusé');
      }
      return { ...tlsOk, protocol: call?.maxVersion ?? null };
    };
    const old = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.tls'),
      context({ fetch: spaFetch().fetch, tls: legacy }),
    );
    expect(old[0]?.result.status).toBe('fail');

    const only12: TlsProbe = async (_host, call) => {
      if (call?.maxVersion !== 'TLSv1.2') {
        throw new NetError('TLS_HANDSHAKE_FAILED', 'refusé');
      }
      return { ...tlsOk, protocol: 'TLSv1.2' };
    };
    const warn = await runChecks(
      ACTIVE_SECURITE_CHECKS.filter((item) => item.id === 'securite.tls'),
      context({ fetch: spaFetch().fetch, tls: only12 }),
    );
    expect(warn[0]?.result.status).toBe('warn');
  });
});

describe('textes, fiches et méthode', () => {
  it('chaque clé active est en français simple', () => {
    const keys = Object.keys(fr).filter((key) =>
      /^securite\.(fichiers|listing|tls)\./.test(key),
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const template = fr[key as keyof typeof fr];
      const issues = lintText(template, 'apps/web/src/i18n/fr.ts');
      expect(failureCount(issues), template).toBe(0);
      expect(
        issues.filter((issue) => issue.rule === 'sentence-length'),
        template,
      ).toEqual([]);
    }
  });

  it('chaque check actif a une fiche et une ligne de méthode', async () => {
    const sheets = await loadFixes(fileFixStore(FIXES_FR_DIR));
    const methode = readFileSync(
      fileURLToPath(new URL('../../../docs/METHODE.md', import.meta.url)),
      'utf8',
    );
    for (const item of ACTIVE_SECURITE_CHECKS) {
      expect(methode).toContain(`| ${item.id} | ${item.weight} |`);
      const sheet = sheets.get(item.id);
      expect(sheet, item.id).toBeTruthy();
      if (!sheet) continue;
      expect(sheet.variants.github_pages).toContain('Limite');
      expect(sheet.variants.github_pages).toContain('Alternative');
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
});
