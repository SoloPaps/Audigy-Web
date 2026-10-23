import { decodeEntities } from './text.js';

export interface SitemapDocument {
  kind: 'urlset' | 'sitemapindex';
  /** Premières adresses conservées, dans l’ordre du fichier. */
  locs: string[];
  /** Nombre d’adresses `<loc>` non vides. */
  total: number;
}

const STORE_LOCS = 40;

/** Analyse un plan XML. `null` si le fichier n’est pas un urlset ou un index bien formé. */
export function parseSitemap(xml: string): SitemapDocument | null {
  if (xml.includes('\0')) return null;
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
  const src = xml.replace(/^\uFEFF/, '');
  let index = 0;
  const stack: string[] = [];
  let root: string | null = null;
  const locs: string[] = [];
  let total = 0;
  let locText: string | null = null;

  while (index < src.length) {
    while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
    if (index >= src.length) break;
    if (src[index] !== '<') {
      const start = index;
      while (index < src.length && src[index] !== '<') index += 1;
      if (locText !== null) locText += src.slice(start, index);
      continue;
    }
    if (src.startsWith('<!--', index)) {
      const end = src.indexOf('-->', index + 4);
      if (end === -1) return null;
      index = end + 3;
      continue;
    }
    if (src.startsWith('<?', index)) {
      const end = src.indexOf('?>', index + 2);
      if (end === -1) return null;
      index = end + 2;
      continue;
    }
    if (src.startsWith('<![CDATA[', index)) {
      const end = src.indexOf(']]>', index + 9);
      if (end === -1) return null;
      if (locText !== null) locText += src.slice(index + 9, end);
      index = end + 3;
      continue;
    }
    if (src.startsWith('<!', index)) return null;
    if (src.startsWith('</', index)) {
      index += 2;
      const nameStart = index;
      while (index < src.length && /[A-Za-z0-9:._-]/.test(src[index] ?? '')) {
        index += 1;
      }
      const name = localName(src.slice(nameStart, index));
      while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
      if (src[index] !== '>') return null;
      index += 1;
      if (stack.pop() !== name) return null;
      if (name === 'loc' && locText !== null) {
        const value = decodeEntities(locText).trim();
        locText = null;
        if (value !== '') {
          total += 1;
          if (locs.length < STORE_LOCS) locs.push(value);
        }
      }
      continue;
    }
    index += 1;
    const nameStart = index;
    while (index < src.length && /[A-Za-z0-9:._-]/.test(src[index] ?? '')) {
      index += 1;
    }
    if (index === nameStart) return null;
    const name = localName(src.slice(nameStart, index));
    let selfClosing = false;
    let closed = false;
    while (index < src.length && !closed) {
      const ch = src[index] ?? '';
      if (ch === '>') {
        index += 1;
        closed = true;
        break;
      }
      if (ch === '/' && src[index + 1] === '>') {
        selfClosing = true;
        index += 2;
        closed = true;
        break;
      }
      if (/\s/.test(ch)) {
        index += 1;
        continue;
      }
      if (!/[A-Za-z_:]/.test(ch)) return null;
      while (index < src.length && /[A-Za-z0-9:._-]/.test(src[index] ?? '')) {
        index += 1;
      }
      while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
      if (src[index] !== '=') continue;
      index += 1;
      while (index < src.length && /\s/.test(src[index] ?? '')) index += 1;
      const quote = src[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        while (index < src.length && src[index] !== quote) index += 1;
        if (src[index] !== quote) return null;
        index += 1;
      } else {
        while (index < src.length && !/[\s>/]/.test(src[index] ?? ''))
          index += 1;
      }
    }
    if (!closed) return null;
    if (stack.length === 0) {
      if (root !== null) return null;
      root = name;
    }
    if (!selfClosing) {
      stack.push(name);
      if (name === 'loc') locText = '';
    }
    if (stack.length > 32) return null;
  }
  if (stack.length !== 0) return null;
  if (root !== 'urlset' && root !== 'sitemapindex') return null;
  return { kind: root, locs, total };
}

function localName(name: string): string {
  const colon = name.indexOf(':');
  const local = colon === -1 ? name : name.slice(colon + 1);
  return local.toLowerCase();
}
