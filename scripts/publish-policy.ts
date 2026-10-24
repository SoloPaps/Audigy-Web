/**
 * En-têtes de l’app après le build statique.
 * La CSP est par page : empreintes des scripts et styles en ligne, sans
 * 'unsafe-inline' sur les scripts. `netlify.toml` ne porte pas la CSP :
 * `apps/web/dist/_headers` la remplace (Netlify donne priorité à ce fichier).
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HOME_MAX_BYTES = 700_000;
export const FONT_MAX_BYTES = 400 * 1024;

export const COMMON_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
} as const;

const TRACKERS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'googletagmanager.com',
  'google-analytics.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'connect.facebook.net',
  'static.hotjar.com',
  'mc.yandex.ru',
];

const TEXT_EXT = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
  '.json',
]);

export function cspHash(content: string): string {
  const digest = createHash('sha256').update(content, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

export function inlineHashes(html: string): {
  scripts: string[];
  styles: string[];
} {
  const scripts: string[] = [];
  const styles: string[] = [];
  for (const match of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    const attrs = match[1] ?? '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const body = match[2] ?? '';
    if (body.length === 0) continue;
    scripts.push(cspHash(body));
  }
  for (const match of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const body = match[2] ?? '';
    if (body.length === 0) continue;
    styles.push(cspHash(body));
  }
  return { scripts: unique(scripts), styles: unique(styles) };
}

export function contentSecurityPolicy(
  scripts: readonly string[],
  styles: readonly string[],
): string {
  const script = ["'self'", ...scripts].join(' ');
  const style = ["'self'", ...styles].join(' ');
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "script-src-attr 'none'",
    `style-src ${style}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function scriptPolicyIsStrict(policy: string): boolean {
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens[0]?.toLowerCase();
    if (
      name !== 'script-src' &&
      name !== 'script-src-elem' &&
      name !== 'script-src-attr'
    ) {
      continue;
    }
    if (tokens.some((token) => token.toLowerCase() === "'unsafe-inline'")) {
      return false;
    }
    if (tokens.some((token) => token.toLowerCase() === "'unsafe-eval'")) {
      return false;
    }
  }
  return (
    policy.includes("object-src 'none'") &&
    policy.includes("frame-ancestors 'none'") &&
    policy.includes("base-uri 'self'")
  );
}

export interface HeaderRule {
  path: string;
  headers: Record<string, string>;
}

export function parseHeaderFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: HeaderRule | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { path: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const name = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (name) current.headers[name] = value;
  }
  return rules;
}

export function headersFor(
  rules: readonly HeaderRule[],
  urlPath: string,
): Record<string, string> {
  const requestPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const matched = rules.filter((rule) => pathMatches(rule.path, requestPath));
  matched.sort((a, b) => specificity(a.path) - specificity(b.path));
  const headers: Record<string, string> = {};
  for (const rule of matched) Object.assign(headers, rule.headers);
  return headers;
}

export function headerPaths(relHtml: string): string[] {
  const rel = relHtml.split(path.sep).join('/');
  if (rel === 'index.html') return ['/', '/index.html'];
  if (rel.endsWith('/index.html')) {
    const dir = `/${rel.slice(0, -'/index.html'.length)}`;
    return [dir, `${dir}/`, `/${rel}`];
  }
  return [`/${rel}`];
}

export function publicPath(relHtml: string): string {
  const rel = relHtml.split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) {
    return `/${rel.slice(0, -'index.html'.length)}`;
  }
  return `/${rel}`;
}

export async function walkFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walkFiles(full)));
    else found.push(full);
  }
  return found;
}

export async function pageWeight(
  dist: string,
  htmlRel = 'index.html',
): Promise<{ bytes: number; files: string[]; fonts: number }> {
  const root = path.resolve(dist);
  const seen = new Set<string>();
  const files: string[] = [];
  let bytes = 0;
  let fonts = 0;

  async function add(file: string): Promise<void> {
    const resolved = path.resolve(file);
    if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) return;
    if (seen.has(resolved)) return;
    let info: Awaited<ReturnType<typeof stat>>;
    try {
      info = await stat(resolved);
    } catch {
      return;
    }
    if (!info.isFile()) return;
    seen.add(resolved);
    files.push(resolved);
    bytes += info.size;
    if (/\.(?:woff2|woff|ttf|otf)$/i.test(resolved)) fonts += info.size;
    const css = resolved.endsWith('.css');
    const html = resolved.endsWith('.html');
    if (!css && !html) return;
    const text = await readFile(resolved, 'utf8');
    const base = path.dirname(resolved);
    for (const ref of refsIn(text, css)) {
      const target = ref.startsWith('/')
        ? path.join(root, ref.slice(1))
        : path.resolve(base, ref);
      await add(target);
    }
  }

  await add(path.join(root, htmlRel));
  return { bytes, files, fonts };
}

export async function trackerHits(dist: string): Promise<string[]> {
  const hits: string[] = [];
  for (const file of await walkFiles(dist)) {
    if (!TEXT_EXT.has(path.extname(file))) continue;
    const text = await readFile(file, 'utf8');
    const rel = path.relative(dist, file);
    for (const host of TRACKERS) {
      if (text.toLowerCase().includes(host)) hits.push(`${rel} ${host}`);
    }
    if (/(?:href|src)\s*=\s*["']\/\//i.test(text)) {
      hits.push(`${rel} url-protocol-relative`);
    }
  }
  return hits;
}

const ISLAND_STYLE =
  '<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>';

/** html-validate n’accepte <style> que dans <head>. Astro l’injecte près de l’île. */
export function hoistIslandStyle(html: string): string {
  if (!html.includes(ISLAND_STYLE)) return html;
  const head = html.indexOf('</head>');
  if (head === -1) return html;
  const without = html.replaceAll(ISLAND_STYLE, '');
  const at = without.indexOf('</head>');
  return `${without.slice(0, at)}${ISLAND_STYLE}${without.slice(at)}`;
}

export async function publish(dist: string): Promise<void> {
  const html = (await walkFiles(dist)).filter(
    (file) =>
      file.endsWith('.html') && !file.includes(`${path.sep}dev${path.sep}`),
  );
  const rules: HeaderRule[] = [{ path: '/*', headers: { ...COMMON_HEADERS } }];
  const locs: string[] = [];
  for (const file of html.sort()) {
    const rel = path.relative(dist, file);
    const raw = await readFile(file, 'utf8');
    const source = hoistIslandStyle(raw);
    if (source !== raw) await writeFile(file, source, 'utf8');
    const hashes = inlineHashes(source);
    const policy = contentSecurityPolicy(hashes.scripts, hashes.styles);
    for (const urlPath of headerPaths(rel)) {
      rules.push({
        path: urlPath,
        headers: { 'Content-Security-Policy': policy },
      });
    }
    locs.push(publicPath(rel));
  }
  await writeFile(path.join(dist, '_headers'), renderHeaders(rules), 'utf8');
  await writeFile(path.join(dist, 'sitemap.xml'), renderSitemap(locs), 'utf8');
}

function renderHeaders(rules: readonly HeaderRule[]): string {
  const lines = [
    '# Généré par scripts/publish-policy.ts. Ne pas éditer à la main.',
  ];
  for (const rule of rules) {
    lines.push(rule.path);
    for (const [name, value] of Object.entries(rule.headers)) {
      lines.push(`  ${name}: ${value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderSitemap(locs: readonly string[]): string {
  const body = locs
    .map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function refsIn(text: string, css: boolean): string[] {
  const refs: string[] = [];
  const pattern = css
    ? /url\(\s*["']?([^"')]+)["']?\s*\)/gi
    : /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of text.matchAll(pattern)) {
    const ref = (match[1] ?? '').split('?')[0]?.split('#')[0] ?? '';
    if (
      ref === '' ||
      ref.startsWith('data:') ||
      ref.startsWith('http:') ||
      ref.startsWith('https:') ||
      ref.startsWith('//') ||
      ref.startsWith('mailto:') ||
      ref.startsWith('#')
    ) {
      continue;
    }
    refs.push(ref);
  }
  if (!css) {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const ref = (match[1] ?? '').split('?')[0] ?? '';
      if (ref.startsWith('/') || ref.startsWith('.')) refs.push(ref);
    }
  }
  return refs;
}

function pathMatches(pattern: string, requestPath: string): boolean {
  if (pattern === '/*') return true;
  if (pattern.endsWith('/*'))
    return requestPath.startsWith(pattern.slice(0, -1));
  return pattern === requestPath;
}

function specificity(pattern: string): number {
  if (pattern === '/*') return 1;
  if (pattern.endsWith('/*')) return 10 + pattern.length;
  return 100 + pattern.length;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await publish(path.join(root, 'apps', 'web', 'dist'));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
