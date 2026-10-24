import { createHash } from 'node:crypto';
import { ARTIFACT_LIMITS } from '@audigy/evidence';
import {
  createRequestBudget,
  createSafeFetch,
  DEFAULT_MAX_TOTAL_BYTES,
  type SafeFetch,
  userAgent,
  validateTargetUrl,
} from '@audigy/net';
import { AxeBuilder } from '@axe-core/playwright';
import axe from 'axe-core';
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  chromium,
  devices,
  type Page,
} from 'playwright';
import {
  detectCmp,
  PROBE_GLOBALS,
  PROBE_SELECTORS,
  probeCmpInPage,
} from './cmp.js';
import {
  cachedResponses,
  createInterceptor,
  createResponseCache,
  type Interceptor,
  type ResponseCache,
} from './intercept.js';
import {
  collectConsole,
  collectMixedContent,
  normalizeCookies,
  type RawAxeResults,
  type RawConsoleMessage,
  summarizeAxe,
} from './observe.js';
import { countDomInPage, storageKeysInPage } from './page-probes.js';
import { rgaaFromAxe } from './rgaa.js';
import {
  BROWSER_RESULT_VERSION,
  type BrowserAuditResult,
  type PageLoad,
  parseBrowserAuditResult,
  type Screenshot,
  type StepError,
  type Viewport,
} from './schema.js';
import { buildHomepageWarc, HOMEPAGE_WARC } from './warc.js';

/**
 * Le navigateur ne résout aucun nom : toute requête qui échapperait à l'interception
 * échoue. Seul `safeFetch` (anti-SSRF, IP épinglée) parle au réseau.
 */
export const LAUNCH_ARGS: readonly string[] = [
  '--host-resolver-rules=MAP * ~NOTFOUND',
  '--dns-prefetch-disable',
  '--no-pings',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-sync',
];

/** Budget du chargement navigateur (§5.4 : « chargement de la page sans interaction »). */
export const BROWSER_BUDGET = {
  maxRequests: 300,
  perHostIntervalMs: 1000,
  maxTotalBytes: DEFAULT_MAX_TOTAL_BYTES,
} as const;

const DESKTOP: BrowserContextOptions = {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
};

const MOBILE: BrowserContextOptions = {
  ...devices['Pixel 7'],
};

export interface BrowserAuditOptions {
  url: string | URL;
  /** Par défaut : `safeFetch` avec `BROWSER_BUDGET`. Les tests injectent un résolveur local. */
  fetch?: SafeFetch;
  /** URL publique d'Audigy (`APP_BASE_URL`), pour le User-Agent. */
  botUrl?: string;
  /** Navigateur fourni (lancé avec `LAUNCH_ARGS`), sinon lancé puis fermé ici. */
  browser?: Browser;
  viewports?: readonly Viewport[];
  navigationTimeoutMs?: number;
  /** Silence réseau attendu après `load`, puis plafond de cette attente. */
  settleMs?: number;
  maxSettleMs?: number;
  now?: () => Date;
  /** WARC de la page d’accueil. Uniquement sur demande (rapport probant). */
  warc?: boolean;
}

export interface ScreenshotFile {
  file: string;
  data: Buffer;
}

export interface WarcFile {
  file: typeof HOMEPAGE_WARC;
  data: Buffer;
}

export interface BrowserAuditOutput {
  result: BrowserAuditResult;
  screenshots: ScreenshotFile[];
  /** Absent ou `null` si l’archive n’a pas été demandée. */
  warc?: WarcFile | null;
}

export function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true, args: [...LAUNCH_ARGS] });
}

interface LoadState {
  load: PageLoad;
  interceptor: Interceptor;
  context: BrowserContext;
  page: Page | null;
  messages: RawConsoleMessage[];
  screenshot: ScreenshotFile | null;
}

/**
 * Charge la page dans un profil vierge, sans aucune interaction, sur ordinateur puis
 * téléphone. Mode passif uniquement : rien n'est cliqué, saisi ni envoyé.
 */
export async function runBrowserAudit(
  options: BrowserAuditOptions,
): Promise<BrowserAuditOutput> {
  const target = validateTargetUrl(options.url);
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const fetch =
    options.fetch ??
    createSafeFetch({
      budget: createRequestBudget(BROWSER_BUDGET),
      ...(options.botUrl ? { botUrl: options.botUrl } : {}),
    });
  const viewports = options.viewports ?? ['desktop', 'mobile'];
  if (!viewports.includes('desktop'))
    throw new Error('Le chargement ordinateur est obligatoire');
  const browser = options.browser ?? (await launchBrowser());
  const cache = createResponseCache();
  const errors: StepError[] = [];

  try {
    const desktop = await loadPage(
      browser,
      'desktop',
      target,
      fetch,
      cache,
      options,
    );
    errors.push(...desktopErrors(desktop));
    const analysis = await analyze(desktop, target, now(), errors);
    const desktopShot = await capture(desktop, errors, now);
    await desktop.context.close();

    let mobile: LoadState | null = null;
    if (viewports.includes('mobile') && !desktop.load.error) {
      mobile = await loadPage(browser, 'mobile', target, fetch, cache, options);
      if (mobile.load.error)
        errors.push({
          step: 'navigation',
          viewport: 'mobile',
          message: mobile.load.error,
        });
      if (mobile.page) await measureEco(mobile, errors);
      await capture(mobile, errors, now);
      await mobile.context.close();
    }

    const finalUrl = desktop.load.finalUrl;
    const thirdParty = desktop.interceptor.records.filter(
      (r) => r.thirdParty && !isNonPublicTarget(r.reason),
    );
    const result: BrowserAuditResult = {
      version: BROWSER_RESULT_VERSION,
      mode: 'passive',
      runner: {
        name: 'audigy-browser',
        browser: `chromium ${browser.version()}`.slice(0, 64),
        axe: axe.version,
        fetchUserAgent: userAgent(options.botUrl),
      },
      target: {
        url: target.href,
        finalUrl,
        secure: (finalUrl ?? target.href).startsWith('https:'),
      },
      startedAt: startedAt.toISOString(),
      finishedAt: now().toISOString(),
      loads: { desktop: desktop.load, mobile: mobile?.load ?? null },
      preConsent: {
        cookies: analysis.cookies,
        localStorage: analysis.storage.localStorage,
        sessionStorage: analysis.storage.sessionStorage,
        thirdPartyHosts: [...new Set(thirdParty.map((r) => r.host))].sort(),
        thirdPartyRequests: thirdParty.length,
      },
      cmp: analysis.cmp,
      console: collectConsole(desktop.messages, desktop.interceptor.refused),
      mixedContent: collectMixedContent(
        finalUrl ?? target.href,
        desktop.messages
          .filter((m) => m.source === 'console')
          .map((m) => m.text),
        desktop.interceptor.records,
      ),
      axe: analysis.axe,
      rgaa: analysis.axe ? rgaaFromAxe(analysis.axe) : null,
      limits: {
        blockedRequests: [desktop, mobile]
          .flatMap((s) => s?.interceptor.records ?? [])
          .filter((r) => r.outcome === 'blocked').length,
        budgetExhausted:
          desktop.interceptor.budgetExhausted ||
          (mobile?.interceptor.budgetExhausted ?? false),
      },
      errors,
    };
    const screenshots = [desktopShot, mobile?.screenshot ?? null].filter(
      (s): s is ScreenshotFile => s !== null,
    );
    const warc = await maybeWarc(
      options.warc === true,
      finalUrl ?? target.href,
      startedAt,
      cache,
      errors,
    );
    return { result: parseBrowserAuditResult(result), screenshots, warc };
  } finally {
    if (!options.browser) await browser.close();
  }
}

/** Destination refusée par l'anti-SSRF : aucun visiteur d'Internet ne la joindrait. */
function isNonPublicTarget(reason: string | null): boolean {
  return reason === 'BLOCKED_ADDRESS' || reason === 'BLOCKED_PORT';
}

function desktopErrors(state: LoadState): StepError[] {
  return state.load.error
    ? [{ step: 'navigation', viewport: 'desktop', message: state.load.error }]
    : [];
}

async function loadPage(
  browser: Browser,
  viewport: Viewport,
  target: URL,
  fetch: SafeFetch,
  cache: ResponseCache,
  options: BrowserAuditOptions,
): Promise<LoadState> {
  const preset = viewport === 'desktop' ? DESKTOP : MOBILE;
  const context = await browser.newContext({
    ...preset,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    colorScheme: 'light',
    serviceWorkers: 'block',
    acceptDownloads: false,
    permissions: [],
  });
  const interceptor = createInterceptor({
    fetch,
    firstPartyHost: target.hostname,
    cache,
  });
  await context.route('**/*', (route) => interceptor.handle(route));
  await context.routeWebSocket(/.*/, async (ws) => {
    interceptor.recordWebSocket(ws.url());
    await ws.close();
  });

  const size = preset.viewport ?? { width: 1280, height: 720 };
  const load: PageLoad = {
    viewport,
    width: size.width,
    height: size.height,
    userAgent: '',
    status: null,
    finalUrl: null,
    timedOut: false,
    error: null,
    requests: interceptor.records,
    eco: null,
    screenshot: null,
  };
  const messages: RawConsoleMessage[] = [];
  const state: LoadState = {
    load,
    interceptor,
    context,
    page: null,
    messages,
    screenshot: null,
  };

  const page = await context.newPage();
  page.on('console', (message) => {
    if (
      message.type() !== 'error' &&
      !message.text().startsWith('Mixed Content:')
    )
      return;
    if (messages.length >= 300) return;
    messages.push({
      source: 'console',
      text: message.text().slice(0, 1000),
      url: message.location().url || null,
    });
  });
  page.on('pageerror', (error) => {
    if (messages.length >= 300) return;
    messages.push({
      source: 'pageerror',
      text: `${error.name}: ${error.message}`.slice(0, 1000),
      url: null,
    });
  });
  page.on('dialog', (dialog) => {
    void dialog.dismiss().catch(() => {});
  });
  page.on('popup', (popup) => {
    void popup.close().catch(() => {});
  });
  load.userAgent = String(await page.evaluate('navigator.userAgent')).slice(
    0,
    512,
  );

  try {
    const response = await page.goto(target.href, {
      waitUntil: 'load',
      timeout: options.navigationTimeoutMs ?? 90_000,
    });
    load.status = response?.status() ?? null;
    load.finalUrl = page.url().slice(0, 2048);
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      load.timedOut = true;
      load.finalUrl = page.url().slice(0, 2048);
    } else {
      const main = interceptor.records.find(
        (r) => r.resourceType === 'document' && r.reason !== null,
      );
      load.error = (main?.reason ?? 'NAVIGATION').slice(0, 64);
      return state;
    }
  }
  if (load.finalUrl === 'about:blank') load.finalUrl = null;
  await settle(
    interceptor,
    options.settleMs ?? 1500,
    options.maxSettleMs ?? 15_000,
  );
  state.page = page;
  return state;
}

/** Attend un silence réseau (aucune requête nouvelle) ; jamais plus de `maxMs`. */
async function settle(
  interceptor: Interceptor,
  quietMs: number,
  maxMs: number,
): Promise<void> {
  const deadline = Date.now() + maxMs;
  let seen = interceptor.records.length;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const count = interceptor.records.length;
    if (count !== seen || interceptor.inflight > 0) {
      seen = count;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return;
    }
  }
}

interface Analysis {
  cookies: BrowserAuditResult['preConsent']['cookies'];
  storage: { localStorage: string[]; sessionStorage: string[] };
  cmp: BrowserAuditResult['cmp'];
  axe: BrowserAuditResult['axe'];
}

async function step<T>(
  errors: StepError[],
  name: StepError['step'],
  viewport: Viewport,
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    errors.push({
      step: name,
      viewport,
      message:
        (error instanceof Error ? error.message : String(error))
          .split('\n')[0]
          ?.slice(0, 300) ?? 'erreur',
    });
    return null;
  }
}

async function analyze(
  state: LoadState,
  target: URL,
  now: Date,
  errors: StepError[],
): Promise<Analysis> {
  const empty: Analysis = {
    cookies: [],
    storage: { localStorage: [], sessionStorage: [] },
    cmp: { detected: [], tcfApi: false, buttons: [] },
    axe: null,
  };
  const page = state.page;
  if (!page) return empty;
  const firstParty = new URL(state.load.finalUrl ?? target.href).hostname;

  const cookies = await step(errors, 'cookies', 'desktop', async () =>
    normalizeCookies(
      await state.context.cookies(),
      firstParty,
      state.interceptor.headerCookies,
      now,
    ),
  );
  const storage = await step(errors, 'storage', 'desktop', () =>
    page.evaluate(storageKeysInPage),
  );
  const cmp = await step(errors, 'cmp', 'desktop', async () => {
    const probe = await page.evaluate(probeCmpInPage, {
      globals: [...PROBE_GLOBALS],
      selectors: [...PROBE_SELECTORS],
    });
    const scripts = state.interceptor.records
      .filter((r) => r.resourceType === 'script')
      .map((r) => r.url);
    return {
      detected: detectCmp(scripts, probe),
      tcfApi: probe.tcfApi,
      buttons: probe.buttons,
    };
  });
  await measureEco(state, errors);
  const axeSummary = await step(errors, 'axe', 'desktop', async () => {
    const results = await new AxeBuilder({ page }).analyze();
    return summarizeAxe(results as unknown as RawAxeResults);
  });
  return {
    cookies: cookies ?? empty.cookies,
    storage: storage ?? empty.storage,
    cmp: cmp ?? empty.cmp,
    axe: axeSummary,
  };
}

async function measureEco(
  state: LoadState,
  errors: StepError[],
): Promise<void> {
  const page = state.page;
  if (!page) return;
  const dom = await step(errors, 'eco', state.load.viewport, () =>
    page.evaluate(countDomInPage),
  );
  if (dom === null) return;
  state.load.eco = {
    domElements: dom,
    requests: state.interceptor.total,
    transferBytes: state.interceptor.transferBytes,
    truncated: state.interceptor.budgetExhausted,
  };
}

async function maybeWarc(
  wanted: boolean,
  homepageUrl: string,
  date: Date,
  cache: ResponseCache,
  errors: StepError[],
): Promise<WarcFile | null> {
  if (!wanted) return null;
  const data = await step(errors, 'warc', 'desktop', () =>
    buildHomepageWarc({
      homepageUrl,
      date,
      exchanges: cachedResponses(cache),
    }),
  );
  if (!data) return null;
  return { file: HOMEPAGE_WARC, data: Buffer.from(data) };
}

async function capture(
  state: LoadState,
  errors: StepError[],
  now: () => Date,
): Promise<ScreenshotFile | null> {
  const page = state.page;
  if (!page) return null;
  const viewport = state.load.viewport;
  const capturedAt = now().toISOString();
  const shot = await step(errors, 'screenshot', viewport, async () => {
    let last: Buffer | null = null;
    for (const quality of [80, 60, 40, 20] as const) {
      const cdp = await state.context.newCDPSession(page);
      try {
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'webp',
          quality,
        });
        last = Buffer.from(data, 'base64');
      } finally {
        await cdp.detach().catch(() => {});
      }
      if (last.length <= ARTIFACT_LIMITS.screenshotBytes) return last;
    }
    throw new Error('CAPTURE_TOO_LARGE');
  });
  if (!shot) return null;
  const scale =
    (viewport === 'desktop' ? DESKTOP : MOBILE).deviceScaleFactor ?? 1;
  const file = `capture-${viewport}.webp`;
  const meta: Screenshot = {
    viewport,
    file,
    format: 'webp',
    width: Math.round(state.load.width * scale),
    height: Math.round(state.load.height * scale),
    bytes: shot.length,
    sha256: createHash('sha256').update(shot).digest('hex'),
    capturedAt,
  };
  state.load.screenshot = meta;
  state.screenshot = { file, data: shot };
  return state.screenshot;
}
