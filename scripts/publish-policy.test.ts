import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { SafeResponse } from '@audigy/net';
import { describe, expect, it } from 'vitest';
import { judgeCsp } from '../packages/engine/checks/securite/csp.js';
import { judgeFrames } from '../packages/engine/checks/securite/frames.js';
import { judgeHsts } from '../packages/engine/checks/securite/hsts.js';
import { judgePermissions } from '../packages/engine/checks/securite/permissions.js';
import { judgeReferrerHeader } from '../packages/engine/checks/securite/referrer.js';
import { judgeXcto } from '../packages/engine/checks/securite/xcto.js';
import {
  COMMON_HEADERS,
  contentSecurityPolicy,
  cspHash,
  HOME_MAX_BYTES,
  headersFor,
  hoistIslandStyle,
  inlineHashes,
  pageWeight,
  parseHeaderFile,
  publish,
  scriptPolicyIsStrict,
  trackerHits,
} from './publish-policy.js';

function response(
  headers: Record<string, string>,
  html = '<!doctype html>',
): SafeResponse {
  const body = new TextEncoder().encode(html);
  return {
    url: 'https://127.0.0.1/',
    status: 200,
    headers: new Headers(headers),
    body,
    transferBytes: body.byteLength,
    ip: '127.0.0.1',
    redirects: [],
    text: () => html,
  };
}

describe('CSP du build', () => {
  it('empreinte un script en ligne et passe la grille sécurité', () => {
    const html =
      '<script type="module">start()</script><style>a{color:red}</style>';
    const hashes = inlineHashes(html);
    expect(hashes.scripts).toEqual([cspHash('start()')]);
    expect(hashes.styles).toEqual([cspHash('a{color:red}')]);
    const policy = contentSecurityPolicy(hashes.scripts, hashes.styles);
    expect(scriptPolicyIsStrict(policy)).toBe(true);
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    for (const directive of policy.split(';')) {
      const name = directive.trim().split(/\s+/u)[0];
      if (name?.startsWith('script-')) {
        expect(directive).not.toContain("'unsafe-inline'");
        expect(directive).not.toContain("'unsafe-eval'");
      }
    }
    const home = response({
      'content-security-policy': policy,
      'strict-transport-security': COMMON_HEADERS['Strict-Transport-Security'],
      'permissions-policy': COMMON_HEADERS['Permissions-Policy'],
      'referrer-policy': COMMON_HEADERS['Referrer-Policy'],
      'x-content-type-options': COMMON_HEADERS['X-Content-Type-Options'],
      'x-frame-options': COMMON_HEADERS['X-Frame-Options'],
    });
    expect(judgeCsp(home).status).toBe('pass');
    expect(judgeFrames(home).status).toBe('pass');
    expect(judgeHsts(home).status).toBe('pass');
    expect(judgePermissions(home).status).toBe('pass');
    expect(judgeReferrerHeader(home).status).toBe('pass');
    expect(judgeXcto(home).status).toBe('pass');
  });

  it('place le style des îles dans head', () => {
    const style =
      '<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>';
    const html = `<!doctype html><html><head><title>T</title></head><body><header>${style}</header></body></html>`;
    const next = hoistIslandStyle(html);
    expect(next.indexOf(style)).toBeLessThan(next.indexOf('</head>'));
    expect(next).not.toContain(`<header>${style}</header>`);
    expect(next.split(style)).toHaveLength(2);
  });

  it('écrit une CSP par page et un plan de site', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-policy-'));
    try {
      await writeFile(
        path.join(dir, 'index.html'),
        '<!doctype html><script>boot()</script>',
        'utf8',
      );
      await publish(dir);
      const rules = parseHeaderFile(
        await readFile(path.join(dir, '_headers'), 'utf8'),
      );
      const headers = headersFor(rules, '/');
      expect(headers['Content-Security-Policy']).toContain(cspHash('boot()'));
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(
        scriptPolicyIsStrict(headers['Content-Security-Policy'] ?? ''),
      ).toBe(true);
      const map = await readFile(path.join(dir, 'sitemap.xml'), 'utf8');
      expect(map).toContain('<loc>/</loc>');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('compte le poids de l’accueil et refuse un traceur', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'audigy-weight-'));
    try {
      await writeFile(
        path.join(dir, 'index.html'),
        '<link rel="stylesheet" href="/a.css">',
        'utf8',
      );
      await writeFile(path.join(dir, 'a.css'), 'body{color:black}', 'utf8');
      const weight = await pageWeight(dir);
      expect(weight.bytes).toBeGreaterThan(0);
      expect(weight.bytes).toBeLessThan(HOME_MAX_BYTES);
      await writeFile(
        path.join(dir, 'extra.js'),
        'https://www.google-analytics.com/g.js',
        'utf8',
      );
      expect(await trackerHits(dir)).toEqual(['extra.js google-analytics.com']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
