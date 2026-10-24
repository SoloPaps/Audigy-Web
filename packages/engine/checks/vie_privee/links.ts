import { readTag } from '../qualite/extract.js';
import { collapse } from '../seo/text.js';

export const MIN_LEGAL_TEXT = 40;

export interface LegalLink {
  url: URL;
  kind: 'mentions' | 'privacy' | 'both';
}

const PRIVACY =
  /(?:politique[- ]de[- ]confidentialite|protection[- ]des[- ]donnees|donnees[- ]personnelles|vie[- ]privee|privacy[- ]policy|(?:^|[^a-z])privacy(?:[^a-z]|$)|(?:^|[^a-z])confidentialite(?:[^a-z]|$))/;
const MENTIONS =
  /(?:mentions[- ]legales|informations[- ]legales|legal[- ]notice|(?:^|[^a-z])mentions(?:[^a-z]|$))/;

export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function visibleText(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return collapse(stripped);
}

export function classifyLink(text: string, url: URL): LegalLink['kind'] | null {
  const blob = `${fold(text)} ${fold(url.pathname)}`;
  const privacy = PRIVACY.test(blob);
  const mentions = MENTIONS.test(blob);
  if (privacy && mentions) return 'both';
  if (privacy) return 'privacy';
  if (mentions) return 'mentions';
  return null;
}

function resolveHttp(href: string, base: URL): URL | null {
  const trimmed = decodeHtml(href).trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('data:')
  ) {
    return null;
  }
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** Liens « Mentions » et « Confidentialité » d’une page HTML. */
export function findLegalLinks(html: string, pageUrl: URL): LegalLink[] {
  const src = html.replace(/^\uFEFF/, '');
  const found: LegalLink[] = [];
  const seen = new Set<string>();
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
    if (src.startsWith('<!', start) || src.startsWith('<?', start)) {
      const end = src.indexOf('>', start + 2);
      index = end === -1 ? src.length : end + 1;
      continue;
    }
    if (src.startsWith('</', start)) {
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
    if ((tag.name === 'script' || tag.name === 'style') && !tag.selfClosing) {
      const close = new RegExp(`</${tag.name}\\s*>`, 'i').exec(
        src.slice(index),
      );
      index =
        close?.index === undefined
          ? src.length
          : index + close.index + close[0].length;
      continue;
    }
    if (tag.name === 'base' && !baseSet) {
      const href = tag.attrs.get('href');
      const resolved = href ? resolveHttp(href, pageUrl) : null;
      if (resolved) {
        base = resolved;
        baseSet = true;
      }
      continue;
    }
    if (tag.name !== 'a' || tag.selfClosing) continue;
    const href = tag.attrs.get('href');
    if (!href) continue;
    const closeAt = src.toLowerCase().indexOf('</a', index);
    const inner = closeAt === -1 ? '' : src.slice(index, closeAt);
    const text = visibleText(inner);
    const url = resolveHttp(href, base);
    if (!url) continue;
    const kind = classifyLink(text, url);
    if (!kind || seen.has(`${kind}:${url.href}`)) continue;
    seen.add(`${kind}:${url.href}`);
    found.push({ url, kind });
  }
  return found;
}

export interface ElementFlags {
  editor: boolean;
  host: boolean;
  contact: boolean;
}

const EDITOR =
  /\b(?:editeur|editrice|directeur de la publication|directrice de la publication|responsable de la publication)\b/;
const HOST = /\b(?:hebergeur|hebergeuse|heberge|hebergee|hebergement)\b/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/;
const PHONE = /(?:\+33[\s.]?(?:\(0\)[\s.]?)?|0)[1-9](?:[\s.]?\d{2}){4}/;

export function legalElements(html: string, text: string): ElementFlags {
  const folded = fold(`${text}\n${html}`);
  return {
    editor: EDITOR.test(folded),
    host: HOST.test(folded),
    contact:
      EMAIL.test(folded) || PHONE.test(folded) || /mailto:|tel:/.test(folded),
  };
}

export function missingElements(flags: ElementFlags): string[] {
  const missing: string[] = [];
  if (!flags.editor) missing.push('l’éditeur');
  if (!flags.host) missing.push('l’hébergeur');
  if (!flags.contact) missing.push('un contact');
  return missing;
}

export function missingLabel(missing: readonly string[]): string {
  if (missing.length <= 1) return missing[0] ?? '';
  const last = missing.at(-1) ?? '';
  return `${missing.slice(0, -1).join(', ')} et ${last}`;
}
