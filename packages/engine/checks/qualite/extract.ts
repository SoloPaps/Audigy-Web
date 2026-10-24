import { decodeEntities } from '../seo/text.js';

export interface ImageFact {
  page: string;
  width: boolean;
  height: boolean;
  svg: boolean;
  modernMarkup: boolean;
  urls: string[];
}

export interface Extracted {
  links: URL[];
  images: ImageFact[];
}

export interface Tag {
  name: string;
  end: number;
  selfClosing: boolean;
  attrs: Map<string, string>;
}

const SKIP = new Set(['mailto:', 'tel:', 'sms:', 'javascript:', 'data:']);

/** Liens `<a>` et images `<img>` / `<picture>` d’une page. */
export function extractDocument(html: string, pageUrl: URL): Extracted {
  const src = html.replace(/^\uFEFF/, '');
  const links: URL[] = [];
  const images: ImageFact[] = [];
  const seenLinks = new Set<string>();
  let base = pageUrl;
  let baseSet = false;
  let picture: { urls: string[]; modern: boolean; svg: boolean } | null = null;
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
      const closed = readClose(src, start);
      if (closed.name === 'picture') picture = null;
      index = closed.end > start ? closed.end : start + 1;
      continue;
    }
    const tag = readTag(src, start);
    if (!tag || tag.end <= start) {
      index = start + 1;
      continue;
    }
    index = tag.end;
    if ((tag.name === 'script' || tag.name === 'style') && !tag.selfClosing) {
      index = skipUntilClose(src, index, tag.name);
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
    if (tag.name === 'picture' && !tag.selfClosing) {
      picture = { urls: [], modern: false, svg: false };
      continue;
    }
    if (tag.name === 'source' && picture) {
      const type = tag.attrs.get('type') ?? '';
      if (isModernType(type)) picture.modern = true;
      if (isSvgType(type)) picture.svg = true;
      for (const item of srcsetUrls(tag.attrs.get('srcset') ?? '')) {
        const url = resolveHttp(item, base);
        if (!url) continue;
        picture.urls.push(url.href);
        if (isModernExt(url)) picture.modern = true;
        if (isSvgExt(url)) picture.svg = true;
      }
      continue;
    }
    if (tag.name === 'a') {
      const href = tag.attrs.get('href');
      if (!href) continue;
      const url = resolveHttp(href, base);
      if (!url || seenLinks.has(url.href)) continue;
      seenLinks.add(url.href);
      links.push(url);
      continue;
    }
    if (tag.name === 'img') {
      images.push(readImage(tag, base, pageUrl, picture));
      picture = null;
    }
  }
  return { links, images };
}

/** Adresse http(s) publique, sans fragment. `null` si le lien n’est pas à suivre. */
export function resolveHttp(value: string, base: URL): URL | null {
  const trimmed = decodeEntities(value).trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  const lower = trimmed.toLowerCase();
  for (const prefix of SKIP) {
    if (lower.startsWith(prefix)) return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const port =
    url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
  if (port !== 80 && port !== 443) return null;
  url.hash = '';
  return url;
}

function readImage(
  tag: Tag,
  base: URL,
  pageUrl: URL,
  picture: { urls: string[]; modern: boolean; svg: boolean } | null,
): ImageFact {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: URL | null): void => {
    if (!url || seen.has(url.href)) return;
    seen.add(url.href);
    urls.push(url.href);
  };
  if (picture) {
    for (const href of picture.urls) add(resolveHttp(href, base));
  }
  add(resolveHttp(tag.attrs.get('src') ?? '', base));
  for (const item of srcsetUrls(tag.attrs.get('srcset') ?? '')) {
    add(resolveHttp(item, base));
  }
  const modernMarkup =
    (picture?.modern ?? false) ||
    urls.some((href) => isModernExt(new URL(href)));
  const svg =
    (picture?.svg ?? false) || urls.some((href) => isSvgExt(new URL(href)));
  return {
    page: pageUrl.href,
    width: positive(tag.attrs.get('width')),
    height: positive(tag.attrs.get('height')),
    svg,
    modernMarkup,
    urls,
  };
}

function srcsetUrls(value: string): string[] {
  if (value.trim() === '') return [];
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter((item) => item !== '');
}

function positive(value: string | undefined): boolean {
  return value !== undefined && /^[1-9]\d*$/.test(value.trim());
}

function isModernType(type: string): boolean {
  const base = type.split(';')[0]?.trim().toLowerCase() ?? '';
  return base === 'image/webp' || base === 'image/avif';
}

function isSvgType(type: string): boolean {
  return (type.split(';')[0]?.trim().toLowerCase() ?? '') === 'image/svg+xml';
}

function isModernExt(url: URL): boolean {
  const ext = extension(url);
  return ext === 'webp' || ext === 'avif';
}

function isSvgExt(url: URL): boolean {
  return extension(url) === 'svg';
}

function extension(url: URL): string {
  const path = url.pathname.toLowerCase();
  const dot = path.lastIndexOf('.');
  if (dot === -1 || dot < path.lastIndexOf('/')) return '';
  return path.slice(dot + 1);
}

function skipUntilClose(src: string, from: number, name: string): number {
  const re = new RegExp(`</${name}\\s*>`, 'i');
  const match = re.exec(src.slice(from));
  if (!match || match.index === undefined) return src.length;
  return from + match.index + match[0].length;
}

function readClose(src: string, start: number): { name: string; end: number } {
  let index = start + 2;
  const nameStart = index;
  while (index < src.length && /[A-Za-z0-9:-]/.test(src[index] ?? '')) {
    index += 1;
  }
  const name = src.slice(nameStart, index).toLowerCase();
  const end = src.indexOf('>', index);
  return { name, end: end === -1 ? src.length : end + 1 };
}

export function readTag(src: string, start: number): Tag | null {
  let index = start + 1;
  const nameStart = index;
  while (index < src.length && /[A-Za-z0-9:-]/.test(src[index] ?? '')) {
    index += 1;
  }
  if (index === nameStart) return null;
  const name = src.slice(nameStart, index).toLowerCase();
  const attrs = new Map<string, string>();
  let selfClosing = false;
  while (index < src.length) {
    const ch = src[index] ?? '';
    if (ch === '>') {
      index += 1;
      break;
    }
    if (ch === '/' && src[index + 1] === '>') {
      selfClosing = true;
      index += 2;
      break;
    }
    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }
    const attrStart = index;
    while (index < src.length && /[^\s=/>]/.test(src[index] ?? '')) index += 1;
    const attrName = src.slice(attrStart, index).toLowerCase();
    while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
    let value = '';
    if (src[index] === '=') {
      index += 1;
      while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
      const quote = src[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const valueStart = index;
        while (index < src.length && src[index] !== quote) index += 1;
        value = src.slice(valueStart, index);
        if (src[index] === quote) index += 1;
      } else {
        const valueStart = index;
        while (index < src.length && !/[\s>]/.test(src[index] ?? '')) {
          index += 1;
        }
        value = src.slice(valueStart, index);
      }
    }
    if (attrName !== '' && !attrs.has(attrName)) attrs.set(attrName, value);
  }
  return { name, end: index, selfClosing, attrs };
}
