import { HSTS_SIX_MONTHS_SECONDS } from './shared.js';

const SCHEMES = new Set([
  'http:',
  'https:',
  'ws:',
  'wss:',
  'ftp:',
  'data:',
  'blob:',
]);

export interface HstsPolicy {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

/** `null` si l'en-tête est absent de sens (max-age manquant ou doublon). */
export function parseHsts(header: string): HstsPolicy | null {
  const seen = new Set<string>();
  let maxAge: number | null = null;
  let includeSubDomains = false;
  let preload = false;
  for (const part of header.split(';')) {
    const text = part.trim();
    if (text === '') continue;
    const eq = text.indexOf('=');
    const name = (eq === -1 ? text : text.slice(0, eq)).trim().toLowerCase();
    const value = eq === -1 ? '' : text.slice(eq + 1).trim();
    if (name === '' || seen.has(name)) return null;
    seen.add(name);
    if (name === 'max-age') {
      if (!/^\d+$/.test(value)) return null;
      const age = Number(value);
      if (!Number.isSafeInteger(age)) return null;
      maxAge = age;
    } else if (name === 'includesubdomains') {
      if (eq !== -1) return null;
      includeSubDomains = true;
    } else if (name === 'preload') {
      if (eq !== -1) return null;
      preload = true;
    }
  }
  if (maxAge === null) return null;
  return { maxAge, includeSubDomains, preload };
}

export function hstsCovers(header: string | null): boolean {
  if (header === null) return false;
  const policy = parseHsts(header);
  return policy !== null && policy.maxAge >= HSTS_SIX_MONTHS_SECONDS;
}

/** `null` si la politique est vide ou invalide (directive inconnue ou en double). */
export function parseCsp(header: string): Map<string, string[]> | null {
  const directives = new Map<string, string[]>();
  let any = false;
  for (const part of header.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens[0]?.toLowerCase();
    if (!name) continue;
    any = true;
    if (!/^[a-z0-9-]+$/.test(name) || directives.has(name)) return null;
    directives.set(name, tokens.slice(1));
  }
  return any ? directives : null;
}

export type ScriptLevel = 'ok' | 'eval' | 'bad';

function isBroad(token: string): boolean {
  return token === '*' || SCHEMES.has(token);
}

export function classifyScript(
  sources: readonly string[] | 'open',
): ScriptLevel {
  if (sources === 'open') return 'bad';
  if (sources.length === 0) return 'ok';
  const lower = sources.map((source) => source.toLowerCase());
  if (lower.includes("'none'")) return lower.length === 1 ? 'ok' : 'bad';
  const hashed = lower.some(
    (source) =>
      source.startsWith("'nonce-") || /^'sha(256|384|512)-/.test(source),
  );
  let allowsEval = false;
  for (const source of lower) {
    if (
      isBroad(source) ||
      source.startsWith('http://') ||
      source.startsWith('ws://')
    )
      return 'bad';
    if (source === "'unsafe-inline'" && !hashed) return 'bad';
    if (source === "'unsafe-eval'" || source === "'wasm-unsafe-eval'")
      allowsEval = true;
  }
  return allowsEval ? 'eval' : 'ok';
}

export function classifyObject(
  sources: readonly string[] | 'open',
): 'ok' | 'bad' {
  if (sources === 'open') return 'bad';
  if (sources.length === 0) return 'ok';
  const lower = sources.map((source) => source.toLowerCase());
  if (lower.includes("'none'")) return lower.length === 1 ? 'ok' : 'bad';
  for (const source of lower) {
    if (isBroad(source) || source.startsWith('http://')) return 'bad';
  }
  return 'ok';
}

export function fallback(
  policy: ReadonlyMap<string, readonly string[]>,
  names: readonly string[],
): readonly string[] | 'open' {
  for (const name of names) {
    if (policy.has(name)) return policy.get(name) ?? [];
  }
  return 'open';
}

export function allowsHttp(sources: readonly string[] | 'open'): boolean {
  if (sources === 'open') return true;
  return sources.some((source) => {
    const value = source.toLowerCase();
    return value === '*' || value === 'http:' || value.startsWith('http://');
  });
}

export function styleIsLoose(sources: readonly string[] | 'open'): boolean {
  if (sources === 'open') return true;
  return sources.some((source) => {
    const value = source.toLowerCase();
    return (
      value === "'unsafe-inline'" ||
      value === 'data:' ||
      value === '*' ||
      value === 'https:' ||
      value === 'http:' ||
      value.startsWith('http://')
    );
  });
}

export type FrameAncestors = readonly string[] | 'absent' | 'duplicate';

export function frameAncestors(header: string): FrameAncestors {
  let found: string[] | null = null;
  for (const part of header.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens[0]?.toLowerCase() !== 'frame-ancestors') continue;
    if (found) return 'duplicate';
    found = tokens.slice(1);
  }
  return found ?? 'absent';
}

export type AncestorVerdict = 'pass' | 'fail' | 'invalid';

export function judgeAncestors(sources: readonly string[]): AncestorVerdict {
  if (sources.length === 0) return 'invalid';
  const lower = sources.map((source) => source.toLowerCase());
  if (lower.includes("'none'")) return lower.length === 1 ? 'pass' : 'invalid';
  for (const source of lower) {
    if (
      isBroad(source) ||
      source.startsWith('http://') ||
      source.startsWith('ws://')
    )
      return 'fail';
  }
  return 'pass';
}

export type XfoVerdict = 'deny' | 'same' | 'allow-from' | 'invalid';

export function judgeXfo(header: string): XfoVerdict {
  const value = header.trim();
  if (/^deny$/i.test(value)) return 'deny';
  if (/^sameorigin$/i.test(value)) return 'same';
  if (/^allow-from\s+\S+$/i.test(value)) return 'allow-from';
  return 'invalid';
}

const REFERRER_PRIVATE = new Set([
  'no-referrer',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
]);
const REFERRER_LEGACY = new Set(['no-referrer-when-downgrade']);
const REFERRER_UNSAFE = new Set([
  'origin',
  'origin-when-cross-origin',
  'unsafe-url',
]);

export type ReferrerKind = 'private' | 'legacy' | 'unsafe' | 'invalid';

/** Dernière valeur reconnue. Les jetons inconnus sont ignorés. */
export function judgeReferrer(header: string): ReferrerKind {
  const tokens = header
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const known = tokens.filter(
    (token) =>
      REFERRER_PRIVATE.has(token) ||
      REFERRER_LEGACY.has(token) ||
      REFERRER_UNSAFE.has(token),
  );
  const last = known[known.length - 1];
  if (!last) return 'invalid';
  if (REFERRER_PRIVATE.has(last)) return 'private';
  if (REFERRER_LEGACY.has(last)) return 'legacy';
  return 'unsafe';
}

export type SameSite = 'strict' | 'lax' | 'none' | 'invalid';

export interface ParsedCookie {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite | null;
  session: boolean;
  hostPrefix: boolean;
  securePrefix: boolean;
  path: string | null;
  domain: string | null;
}

export function parseCookie(line: string): ParsedCookie | null {
  const parts = line
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  const eq = first.indexOf('=');
  if (eq <= 0) return null;
  const name = first.slice(0, eq).trim();
  if (name === '') return null;
  let secure = false;
  let httpOnly = false;
  let session = true;
  let sameSite: SameSite | null = null;
  let path: string | null = null;
  let domain: string | null = null;
  for (const attr of parts.slice(1)) {
    const split = attr.indexOf('=');
    const key = (split === -1 ? attr : attr.slice(0, split))
      .trim()
      .toLowerCase();
    const value = split === -1 ? '' : attr.slice(split + 1).trim();
    if (key === 'secure') secure = true;
    else if (key === 'httponly') httpOnly = true;
    else if (key === 'max-age' || key === 'expires') session = false;
    else if (key === 'path') path = value;
    else if (key === 'domain') domain = value;
    else if (key === 'samesite') {
      const site = value.toLowerCase();
      sameSite =
        site === 'strict' || site === 'lax' || site === 'none'
          ? site
          : 'invalid';
    }
  }
  return {
    name,
    secure,
    httpOnly,
    sameSite,
    session,
    hostPrefix: name.startsWith('__Host-'),
    securePrefix: name.startsWith('__Secure-'),
    path,
    domain,
  };
}

export function isAntiCsrf(name: string): boolean {
  return /csrf|xsrf/i.test(name);
}

export function prefixViolated(cookie: ParsedCookie): boolean {
  if (cookie.hostPrefix)
    return !cookie.secure || cookie.domain !== null || cookie.path !== '/';
  if (cookie.securePrefix) return !cookie.secure;
  return false;
}

const SENSITIVE = ['camera', 'microphone', 'geolocation'] as const;
export const SENSITIVE_FEATURES: readonly string[] = SENSITIVE;

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
    return value.slice(1, -1);
  return value;
}

/** `null` si la syntaxe est invalide. */
export function parsePermissions(header: string): Map<string, string[]> | null {
  const features = new Map<string, string[]>();
  const parts = splitCommas(header);
  let any = false;
  for (const part of parts) {
    const text = part.trim();
    if (text === '') continue;
    any = true;
    const eq = text.indexOf('=');
    if (eq === -1) return null;
    const name = text.slice(0, eq).trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name) || features.has(name)) return null;
    const raw = text.slice(eq + 1).trim();
    if (raw === '*') {
      features.set(name, ['*']);
      continue;
    }
    if (raw === 'self' || raw === "'self'") {
      features.set(name, ['self']);
      continue;
    }
    if (!raw.startsWith('(') || !raw.endsWith(')')) return null;
    const inner = raw.slice(1, -1).trim();
    const items = inner === '' ? [] : inner.split(/\s+/).map(unquote);
    if (items.some((item) => item === '')) return null;
    features.set(name, items);
  }
  return any ? features : null;
}

function splitCommas(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of input) {
    if (char === '(') depth += 1;
    else if (char === ')' && depth > 0) depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

export function featureIsOpen(values: readonly string[] | undefined): boolean {
  if (!values) return false;
  return values.some((value) => value === '*');
}

export interface SecurityFields {
  contacts: string[];
  expires: Date | null;
  canonical: string[];
}

export function securityFields(body: string): SecurityFields {
  const contacts: string[] = [];
  const canonical: string[] = [];
  let expires: Date | null = null;
  for (const raw of clearSigned(body)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (name === 'contact' && validContact(value)) contacts.push(value);
    else if (name === 'expires' && expires === null) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) expires = new Date(time);
    } else if (name === 'canonical') canonical.push(value);
  }
  return { contacts, expires, canonical };
}

function clearSigned(body: string): string {
  const start = body.indexOf('-----BEGIN PGP SIGNED MESSAGE-----');
  if (start === -1) return body;
  const after = body.slice(start);
  const headerEnd = after.indexOf('\n\n');
  const signature = after.indexOf('-----BEGIN PGP SIGNATURE-----');
  if (headerEnd === -1 || signature === -1 || signature < headerEnd)
    return body;
  return after.slice(headerEnd + 2, signature);
}

function validContact(value: string): boolean {
  if (/^mailto:\S+@\S+\.\S+$/i.test(value)) return true;
  if (/^tel:\+?[0-9().\-\s]{6,}$/i.test(value)) return true;
  return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(value);
}

const ACTIVE_AS = new Set([
  'script',
  'style',
  'font',
  'document',
  'fetch',
  'worker',
  'xhr',
  'manifest',
]);

export interface MixedHits {
  active: string[];
  passive: string[];
}

/** Balises et CSS statiques. Un `>` dans un attribut peut tronquer la balise. */
export function scanMixed(html: string): MixedHits {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const active: string[] = [];
  const passive: string[] = [];
  const styles: string[] = [];
  for (const block of noComments.matchAll(
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
  )) {
    if (block[1]) styles.push(block[1]);
  }
  const withoutStyle = noComments.replace(
    /<style\b[^>]*>[\s\S]*?<\/style>/gi,
    '',
  );
  for (const tag of withoutStyle.matchAll(/<([a-zA-Z][\w:-]*)\b([^>]*)>/g)) {
    const name = tag[1]?.toLowerCase() ?? '';
    const attrs = attributes(tag[2] ?? '');
    const style = attrs.get('style');
    if (style) styles.push(style);
    collectTag(name, attrs, active, passive);
  }
  for (const css of styles) {
    const found = cssUrls(css);
    active.push(...found.active);
    passive.push(...found.passive);
  }
  return { active: unique(active), passive: unique(passive) };
}

function collectTag(
  name: string,
  attrs: ReadonlyMap<string, string>,
  active: string[],
  passive: string[],
): void {
  const take = (value: string | undefined, kind: 'active' | 'passive') => {
    if (!value || !/^http:\/\//i.test(value.trim())) return;
    (kind === 'active' ? active : passive).push(value.trim());
  };
  if (name === 'script') take(attrs.get('src'), 'active');
  else if (name === 'iframe' || name === 'frame' || name === 'embed')
    take(attrs.get('src'), 'active');
  else if (name === 'object') take(attrs.get('data'), 'active');
  else if (name === 'form') take(attrs.get('action'), 'active');
  else if (name === 'base') take(attrs.get('href'), 'active');
  else if (name === 'img') {
    take(attrs.get('src'), 'passive');
    for (const url of srcset(attrs.get('srcset'))) take(url, 'passive');
  } else if (name === 'audio' || name === 'video' || name === 'track') {
    take(attrs.get('src'), 'passive');
    take(attrs.get('poster'), 'passive');
  } else if (name === 'source') {
    take(attrs.get('src'), 'passive');
    for (const url of srcset(attrs.get('srcset'))) take(url, 'passive');
  } else if (name === 'link') {
    const rel = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
    const href = attrs.get('href');
    const as = (attrs.get('as') ?? '').toLowerCase();
    if (rel.includes('stylesheet') || rel.includes('modulepreload'))
      take(href, 'active');
    else if (rel.includes('preload') || rel.includes('prefetch'))
      take(href, ACTIVE_AS.has(as) ? 'active' : 'passive');
    else if (rel.includes('icon') || rel.includes('apple-touch-icon'))
      take(href, 'passive');
  }
}

function attributes(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const re = /([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const match of raw.matchAll(re)) {
    const name = match[1]?.toLowerCase();
    if (!name || attrs.has(name)) continue;
    attrs.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function srcset(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
}

function cssUrls(css: string): MixedHits {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const active: string[] = [];
  const fontRe = /@font-face\s*\{([\s\S]*?)\}/gi;
  for (const block of text.matchAll(fontRe))
    active.push(...httpUrls(block[1] ?? ''));
  let rest = text.replace(fontRe, '');
  const importRe =
    /@import\s+(?:url\(\s*(['"]?)(http:\/\/[^'")\s;]+)\1|(['"])(http:\/\/[^'"]+)\3)/gi;
  for (const match of rest.matchAll(importRe)) {
    const url = match[2] ?? match[4];
    if (url) active.push(url);
  }
  rest = rest.replace(/@import[^;]*;/gi, '');
  return { active, passive: httpUrls(rest) };
}

function httpUrls(css: string): string[] {
  const urls: string[] = [];
  const re = /url\(\s*(['"]?)(http:\/\/[^'")\s]+)\1/gi;
  for (const match of css.matchAll(re)) {
    if (match[2]) urls.push(match[2]);
  }
  return urls;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
