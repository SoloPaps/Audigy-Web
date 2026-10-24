import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Browser } from 'playwright';
import {
  type FixtureServer,
  startFixtureServer,
} from '../../../fixtures/server.js';
import {
  type BrowserAuditOutput,
  BrowserAuditResultSchema,
  launchBrowser,
  runBrowserAudit,
} from '../src/index.js';
import { fixtureFetch, PUBLIC_IP } from './helpers.js';

let browser: Browser;
let site: FixtureServer;
let output: BrowserAuditOutput;
let dialed: string[];

test.beforeAll(async () => {
  browser = await launchBrowser();
  site = await startFixtureServer('navigateur');
  const net = fixtureFetch(site.port);
  dialed = net.dialed;
  output = await runBrowserAudit({
    url: 'https://navigateur.example/',
    fetch: net.fetch,
    browser,
    settleMs: 500,
  });
});

test.afterAll(async () => {
  await site?.close();
  await browser?.close();
});

test('la sortie est conforme au schéma zod', () => {
  const copy: unknown = JSON.parse(JSON.stringify(output.result));
  const parsed = BrowserAuditResultSchema.safeParse(copy);
  expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  expect(output.result.mode).toBe('passive');
  expect(output.result.target.finalUrl).toBe('https://navigateur.example/');
  expect(output.result.loads.desktop.status).toBe(200);
  expect(output.result.errors).toEqual([]);
});

test('détecte les traces posées avant consentement', () => {
  const cookies = output.result.preConsent.cookies;
  const byName = new Map(cookies.map((c) => [c.name, c]));
  expect(byName.get('session_id')).toMatchObject({
    setBy: 'header',
    thirdParty: false,
    httpOnly: true,
    expires: null,
  });
  expect(byName.get('panier')).toMatchObject({
    setBy: 'script',
    thirdParty: false,
  });
  expect(byName.get('_ga')).toMatchObject({ setBy: 'script' });
  expect(byName.get('_ga')?.lifetimeDays).toBeGreaterThan(390);
  expect(byName.get('uid')).toMatchObject({
    setBy: 'header',
    thirdParty: true,
    domain: 'traceur.example',
  });
  expect(JSON.stringify(cookies)).not.toContain('abc123');
  expect(JSON.stringify(cookies)).not.toContain('tiers-42');
});

test('relève les requêtes tierces avant consentement', () => {
  const { preConsent, loads } = output.result;
  expect(preConsent.thirdPartyHosts).toEqual([
    'media.example',
    'traceur.example',
  ]);
  expect(preConsent.thirdPartyRequests).toBeGreaterThanOrEqual(3);
  const post = loads.desktop.requests.find((r) => r.method === 'POST');
  expect(post).toMatchObject({
    host: 'traceur.example',
    thirdParty: true,
    outcome: 'stubbed',
  });
  expect(site.requests).not.toContain('/tiers/event');
});

test('reconnaît tarteaucitron et les boutons du premier niveau', () => {
  const [match] = output.result.cmp.detected;
  expect(output.result.cmp.detected).toHaveLength(1);
  expect(match?.id).toBe('tarteaucitron');
  expect(match?.evidence).toEqual(
    expect.arrayContaining([
      'global:tarteaucitron',
      'dom:#tarteaucitronRoot',
      'script:https://navigateur.example/tarteaucitron/tarteaucitron.js',
    ]),
  );
  expect(output.result.cmp.buttons).toEqual([
    'Tout accepter',
    'Tout refuser',
    'Personnaliser',
  ]);
});

test('axe trouve les erreurs plantées', () => {
  const failed = output.result.axe?.violations.map((v) => v.id) ?? [];
  expect(failed).toEqual(
    expect.arrayContaining([
      'button-name',
      'color-contrast',
      'html-has-lang',
      'image-alt',
      'label',
    ]),
  );
  const rgaa = new Map(
    output.result.rgaa?.criteria.map((c) => [c.id, c.status]) ?? [],
  );
  expect(rgaa.get('1.1')).toBe('fail');
  expect(rgaa.get('3.2')).toBe('fail');
  expect(rgaa.get('8.3')).toBe('fail');
  expect(rgaa.get('11.1')).toBe('fail');
  expect(rgaa.get('8.5')).toBe('passed_auto');
  expect(output.result.rgaa?.coverage).toBe('partial');
});

test('relève les erreurs console et le contenu mixte dynamique', () => {
  const texts = output.result.console
    .filter((c) => !c.runnerCaused)
    .map((c) => c.text);
  expect(texts).toEqual(
    expect.arrayContaining([
      'Erreur plantée pour le test',
      'Error: Exception plantée',
    ]),
  );
  expect(output.result.mixedContent).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        url: 'http://media.example/tiers/lib.js',
        kind: 'blocked',
      }),
      expect.objectContaining({
        url: 'http://media.example/tiers/photo.svg',
        kind: 'upgraded',
      }),
    ]),
  );
});

test("passe par l'anti-SSRF : adresses internes refusées, jamais contactées", () => {
  const blocked = output.result.loads.desktop.requests.filter(
    (r) => r.outcome === 'blocked',
  );
  expect(blocked).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        host: '169.254.169.254',
        reason: 'BLOCKED_ADDRESS',
      }),
      expect.objectContaining({
        host: 'interne.example',
        reason: 'BLOCKED_ADDRESS',
      }),
    ]),
  );
  expect(site.requests).not.toContain('/latest/meta-data/');
  expect(site.requests).not.toContain('/tiers/interne.svg');
  expect(new Set(dialed)).toEqual(new Set([PUBLIC_IP]));
  expect(output.result.limits.blockedRequests).toBeGreaterThanOrEqual(2);
  const runnerErrors = output.result.console.filter((c) => c.runnerCaused);
  for (const entry of runnerErrors)
    expect(entry.url ?? entry.text).toMatch(/169\.254|interne|BLOCKED/);
});

test('mesure poids, requêtes et DOM, et capture les deux formats', () => {
  const { desktop, mobile } = output.result.loads;
  expect(desktop.eco?.domElements).toBeGreaterThan(10);
  expect(desktop.eco?.requests).toBeGreaterThanOrEqual(8);
  expect(desktop.eco?.transferBytes).toBeGreaterThan(500);
  expect(desktop.eco?.truncated).toBe(false);
  expect(mobile?.eco?.domElements).toBe(desktop.eco?.domElements);
  expect(mobile?.requests.some((r) => r.outcome === 'network')).toBe(false);
  expect(mobile?.width).toBeLessThan(500);

  expect(output.screenshots.map((s) => s.file).sort()).toEqual([
    'capture-desktop.webp',
    'capture-mobile.webp',
  ]);
  for (const shot of output.screenshots) {
    expect(shot.data.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(shot.data.subarray(8, 12).toString('latin1')).toBe('WEBP');
    const meta =
      shot.file === 'capture-desktop.webp'
        ? desktop.screenshot
        : mobile?.screenshot;
    expect(meta?.sha256).toBe(
      createHash('sha256').update(shot.data).digest('hex'),
    );
    expect(meta?.bytes).toBe(shot.data.length);
  }
});

test('un site propre : aucune trace, aucun tiers, aucun bandeau', async () => {
  const bon = await startFixtureServer('bon');
  try {
    const { result } = await runBrowserAudit({
      url: 'http://bon.example/',
      fetch: fixtureFetch(bon.port).fetch,
      browser,
      viewports: ['desktop'],
      settleMs: 300,
    });
    expect(result.preConsent.cookies).toEqual([]);
    expect(result.preConsent.thirdPartyHosts).toEqual([]);
    expect(result.cmp.detected).toEqual([]);
    expect(result.mixedContent).toEqual([]);
    expect(result.loads.mobile).toBeNull();
    expect(result.target.secure).toBe(false);
  } finally {
    await bon.close();
  }
});

test('une cible interne est refusée avant tout chargement', async () => {
  await expect(
    runBrowserAudit({ url: 'http://127.0.0.1:8080/', browser }),
  ).rejects.toMatchObject({ code: 'BLOCKED_PORT' });
  const { result } = await runBrowserAudit({
    url: 'http://interne.example/',
    fetch: fixtureFetch(1).fetch,
    browser,
    settleMs: 100,
  });
  expect(result.loads.desktop.error).toBe('BLOCKED_ADDRESS');
  expect(result.loads.mobile).toBeNull();
  expect(result.errors).toEqual([
    { step: 'navigation', viewport: 'desktop', message: 'BLOCKED_ADDRESS' },
  ]);
  expect(result.axe).toBeNull();
});
