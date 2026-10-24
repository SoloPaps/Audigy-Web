import { readTag, resolveHttp } from '../../qualite/extract.js';
import { decodeEntities } from '../../seo/text.js';

export interface PageScripts {
  /** Scripts externes, dans l’ordre, sans doublon. */
  sources: URL[];
  /** Corps des scripts en ligne exécutables. */
  inline: string[];
  /** Valeurs des balises `<meta name="generator">`. */
  generators: string[];
}

/** Scripts en ligne gardés, et leur taille cumulée maximale. */
export const INLINE_LIMIT = 20;
export const INLINE_MAX_CHARS = 512 * 1024;

const JS_TYPES = new Set([
  '',
  'module',
  'text/javascript',
  'application/javascript',
  'application/ecmascript',
  'text/ecmascript',
  'application/x-javascript',
  'text/jscript',
]);

function isJs(type: string | undefined): boolean {
  return JS_TYPES.has(
    decodeEntities(type ?? '')
      .split(';')[0]
      ?.trim()
      .toLowerCase() ?? '',
  );
}

/** Lit les scripts et la balise generator, comme un visiteur sans navigateur. */
export function extractScripts(html: string, pageUrl: URL): PageScripts {
  const src = html.replace(/^\uFEFF/, '');
  const sources: URL[] = [];
  const seen = new Set<string>();
  const inline: string[] = [];
  const generators: string[] = [];
  let inlineChars = 0;
  let base = pageUrl;
  let baseSet = false;
  let index = 0;
  while (index < src.length) {
    const start = src.indexOf('<', index);
    if (start === -1) break;
    if (src.startsWith('<!--', start)) {
      const end = src.indexOf('-->', start + 4);
      index = end === -1 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith('</', start) || src.startsWith('<!', start)) {
      const end = src.indexOf('>', start + 2);
      index = end === -1 ? src.length : end + 1;
      continue;
    }
    const tag = readTag(src, start);
    if (!tag || tag.end <= start) {
      index = start + 1;
      continue;
    }
    index = tag.end;
    if (tag.name === 'base' && !baseSet) {
      const href = tag.attrs.get('href');
      const resolved = href ? resolveHttp(href, pageUrl) : null;
      if (resolved) {
        base = resolved;
        baseSet = true;
      }
      continue;
    }
    if (tag.name === 'meta') {
      const name = decodeEntities(tag.attrs.get('name') ?? '')
        .trim()
        .toLowerCase();
      const content = tag.attrs.get('content');
      if (name === 'generator' && content !== undefined) {
        generators.push(decodeEntities(content).trim());
      }
      continue;
    }
    if (tag.name === 'style' && !tag.selfClosing) {
      index = closeOf(src, index, 'style').after;
      continue;
    }
    if (tag.name !== 'script') continue;
    const close = tag.selfClosing
      ? { body: '', after: index }
      : closeOf(src, index, 'script');
    index = close.after;
    if (!isJs(tag.attrs.get('type'))) continue;
    const href = tag.attrs.get('src');
    if (href !== undefined) {
      const url = resolveHttp(href, base);
      if (url && !seen.has(url.href)) {
        seen.add(url.href);
        sources.push(url);
      }
      continue;
    }
    const body = close.body.trim();
    if (
      body !== '' &&
      inline.length < INLINE_LIMIT &&
      inlineChars + body.length <= INLINE_MAX_CHARS
    ) {
      inline.push(body);
      inlineChars += body.length;
    }
  }
  return { sources, inline, generators };
}

function closeOf(
  src: string,
  from: number,
  name: string,
): { body: string; after: number } {
  const re = new RegExp(`</${name}\\s*>`, 'ig');
  re.lastIndex = from;
  const match = re.exec(src);
  if (!match) return { body: src.slice(from), after: src.length };
  return {
    body: src.slice(from, match.index),
    after: match.index + match[0].length,
  };
}
