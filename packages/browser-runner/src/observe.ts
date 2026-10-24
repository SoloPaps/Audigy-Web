import type {
  AxeRule,
  AxeSummary,
  ConsoleEntry,
  CookieRecord,
  MixedContent,
  RequestRecord,
} from './schema.js';
import { cookieIsThirdParty } from './site.js';

const MIXED =
  /^Mixed Content: .*?requested an insecure ([\w ]+?) '([^']+)'\. ([\s\S]*)$/;

/** Lit un message « Mixed Content » de Chromium. `null` si ce n'en est pas un. */
export function parseMixedContent(text: string): MixedContent | null {
  const match = MIXED.exec(text);
  if (!match) return null;
  const [, type, url, rest] = match;
  if (!url || !rest) return null;
  const kind = /has been blocked/i.test(rest)
    ? 'blocked'
    : /automatically upgraded/i.test(rest)
      ? 'upgraded'
      : 'loaded';
  return {
    url: url.slice(0, 2048),
    kind,
    resourceType: type?.trim().slice(0, 32) ?? null,
  };
}

/** Contenu mixte : messages du navigateur, puis requêtes en clair parties d'une page chiffrée. */
export function collectMixedContent(
  pageUrl: string,
  messages: readonly string[],
  requests: readonly RequestRecord[],
): MixedContent[] {
  if (!pageUrl.startsWith('https:')) return [];
  const found = new Map<string, MixedContent>();
  for (const text of messages) {
    const entry = parseMixedContent(text);
    if (entry) found.set(`${entry.kind} ${entry.url}`, entry);
  }
  for (const request of requests) {
    if (!request.url.startsWith('http:') || request.url === pageUrl) continue;
    const redirect =
      request.status !== null && request.status >= 300 && request.status < 400;
    if (redirect || request.outcome !== 'network') continue;
    const entry: MixedContent = {
      url: request.url,
      kind: 'loaded',
      resourceType: request.resourceType,
    };
    found.set(`loaded ${entry.url}`, entry);
  }
  return [...found.values()].slice(0, 200);
}

export interface RawConsoleMessage {
  source: 'console' | 'pageerror';
  text: string;
  url: string | null;
}

/** Erreurs de la page, sans le contenu mixte (rapporté à part). */
export function collectConsole(
  messages: readonly RawConsoleMessage[],
  refused: ReadonlySet<string>,
): ConsoleEntry[] {
  const out: ConsoleEntry[] = [];
  for (const message of messages) {
    if (message.text.startsWith('Mixed Content:')) continue;
    const runnerCaused =
      (message.url !== null && refused.has(message.url)) ||
      message.text.includes('ERR_BLOCKED_BY_CLIENT');
    out.push({
      source: message.source,
      text: message.text.slice(0, 500),
      url: message.url ? message.url.slice(0, 2048) : null,
      runnerCaused,
    });
    if (out.length >= 100) break;
  }
  return out;
}

/** Cookie tel que rendu par `BrowserContext.cookies()`. */
export interface RawCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

function domainMatches(cookieDomain: string, host: string): boolean {
  const domain = cookieDomain.replace(/^\./, '').toLowerCase();
  const h = host.toLowerCase();
  return h === domain || h.endsWith(`.${domain}`);
}

/** Traces présentes avant tout choix : la valeur est remplacée par sa longueur. */
export function normalizeCookies(
  cookies: readonly RawCookie[],
  firstPartyHost: string,
  headerCookies: ReadonlyMap<string, ReadonlySet<string>>,
  now: Date,
): CookieRecord[] {
  const records = cookies.slice(0, 500).map((cookie): CookieRecord => {
    const session = cookie.expires < 0;
    const expiresMs = cookie.expires * 1000;
    let setBy: CookieRecord['setBy'] = 'script';
    for (const [host, names] of headerCookies) {
      if (names.has(cookie.name) && domainMatches(cookie.domain, host)) {
        setBy = 'header';
        break;
      }
    }
    return {
      name: cookie.name.slice(0, 256),
      domain: cookie.domain.slice(0, 255),
      path: cookie.path.slice(0, 1024),
      thirdParty: cookieIsThirdParty(cookie.domain, firstPartyHost),
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expires: session ? null : new Date(expiresMs).toISOString(),
      lifetimeDays: session
        ? null
        : Math.max(
            0,
            Math.round(((expiresMs - now.getTime()) / 86_400_000) * 10) / 10,
          ),
      setBy,
      valueLength: cookie.value.length,
    };
  });
  return records.sort(
    (a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.name.localeCompare(b.name) ||
      a.path.localeCompare(b.path),
  );
}

/** Résultat brut d'axe-core (sous-ensemble utilisé). */
export interface RawAxeRule {
  id: string;
  impact?: string | null;
  tags: string[];
  help: string;
  helpUrl: string;
  nodes: { target: unknown[]; html: string }[];
}

export interface RawAxeResults {
  testEngine: { version: string };
  url: string;
  violations: RawAxeRule[];
  incomplete: RawAxeRule[];
  passes: { id: string }[];
  inapplicable: { id: string }[];
}

const IMPACTS = new Set(['minor', 'moderate', 'serious', 'critical']);

function selectorOf(target: unknown): string {
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) return target.map(selectorOf).join(' >>> ');
  return String(target);
}

function summarizeRule(rule: RawAxeRule): AxeRule {
  const impact =
    rule.impact && IMPACTS.has(rule.impact)
      ? (rule.impact as AxeRule['impact'])
      : null;
  return {
    id: rule.id.slice(0, 64),
    impact,
    tags: rule.tags.slice(0, 40).map((tag) => tag.slice(0, 64)),
    help: rule.help.slice(0, 300),
    helpUrl: rule.helpUrl.slice(0, 300),
    nodeCount: rule.nodes.length,
    nodes: rule.nodes.slice(0, 20).map((node) => ({
      target: node.target.slice(0, 10).map((t) => selectorOf(t).slice(0, 300)),
      html: node.html.slice(0, 300),
    })),
  };
}

const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function summarizeAxe(results: RawAxeResults): AxeSummary {
  return {
    version: results.testEngine.version.slice(0, 32),
    url: results.url.slice(0, 2048),
    violations: [...results.violations].sort(byId).map(summarizeRule),
    incomplete: [...results.incomplete].sort(byId).map(summarizeRule),
    passes: results.passes.map((r) => r.id).sort(),
    inapplicable: results.inapplicable.map((r) => r.id).sort(),
  };
}
