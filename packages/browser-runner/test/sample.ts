import type { BrowserAuditResult, PageLoad } from '../src/schema.js';

export function samplePageLoad(viewport: PageLoad['viewport']): PageLoad {
  return {
    viewport,
    width: viewport === 'desktop' ? 1920 : 412,
    height: viewport === 'desktop' ? 1080 : 839,
    userAgent: 'Mozilla/5.0 HeadlessChrome/156.0',
    status: 200,
    finalUrl: 'https://www.exemple.fr/',
    timedOut: false,
    error: null,
    requests: [
      {
        url: 'https://www.exemple.fr/',
        method: 'GET',
        resourceType: 'document',
        host: 'www.exemple.fr',
        thirdParty: false,
        outcome: viewport === 'desktop' ? 'network' : 'cache',
        status: 200,
        mimeType: 'text/html',
        transferBytes: 1200,
        reason: null,
      },
    ],
    eco: {
      domElements: 120,
      requests: 1,
      transferBytes: 1200,
      truncated: false,
    },
    screenshot: {
      viewport,
      file: `capture-${viewport}.webp`,
      format: 'webp',
      width: 1920,
      height: 1080,
      bytes: 3,
      sha256: 'a'.repeat(64),
    },
  };
}

export function sampleResult(): BrowserAuditResult {
  return {
    version: 1,
    mode: 'passive',
    runner: {
      name: 'audigy-browser',
      browser: 'chromium 156.0.8078.4',
      axe: '4.14.0',
      fetchUserAgent: 'AudigyBot/1.0',
    },
    target: {
      url: 'https://www.exemple.fr/',
      finalUrl: 'https://www.exemple.fr/',
      secure: true,
    },
    startedAt: '2026-10-24T08:00:00.000Z',
    finishedAt: '2026-10-24T08:00:20.000Z',
    loads: {
      desktop: samplePageLoad('desktop'),
      mobile: samplePageLoad('mobile'),
    },
    preConsent: {
      cookies: [
        {
          name: '_ga',
          domain: '.exemple.fr',
          path: '/',
          thirdParty: false,
          secure: false,
          httpOnly: false,
          sameSite: 'Lax',
          expires: '2027-11-28T08:00:00.000Z',
          lifetimeDays: 400,
          setBy: 'script',
          valueLength: 26,
        },
      ],
      localStorage: [],
      sessionStorage: [],
      thirdPartyHosts: ['www.googletagmanager.com'],
      thirdPartyRequests: 1,
    },
    cmp: { detected: [], tcfApi: false, buttons: [] },
    console: [],
    mixedContent: [],
    axe: {
      version: '4.14.0',
      url: 'https://www.exemple.fr/',
      violations: [],
      incomplete: [],
      passes: ['document-title'],
      inapplicable: [],
    },
    rgaa: {
      version: '4.1.2',
      criteriaTotal: 106,
      criteriaMapped: 1,
      coverage: 'partial',
      criteria: [
        {
          id: '8.5',
          status: 'passed_auto',
          rules: ['document-title'],
          failedRules: [],
        },
      ],
    },
    limits: { blockedRequests: 0, budgetExhausted: false },
    errors: [],
  };
}
