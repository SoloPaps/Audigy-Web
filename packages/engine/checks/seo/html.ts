import { collapse, decodeEntities } from './text.js';

export interface HreflangLink {
  lang: string;
  href: string;
}

export interface MetaRobots {
  agent: string;
  content: string;
}

export interface PageFacts {
  titles: string[];
  descriptions: string[];
  canonicals: string[];
  metaRobots: MetaRobots[];
  hreflangs: HreflangLink[];
  jsonld: string[];
}

interface Tag {
  name: string;
  end: number;
  selfClosing: boolean;
  attrs: Map<string, string>;
}

/** Extrait titre, description, canonical, robots, hreflang et JSON-LD. */
export function parseHtml(html: string): PageFacts {
  const src = html.replace(/^\uFEFF/, '');
  const facts: PageFacts = {
    titles: [],
    descriptions: [],
    canonicals: [],
    metaRobots: [],
    hreflangs: [],
    jsonld: [],
  };
  let index = 0;
  let svg = 0;
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
      if (closed.name === 'svg' && svg > 0) svg -= 1;
      index = closed.end > start ? closed.end : start + 1;
      continue;
    }
    const tag = readTag(src, start);
    if (!tag || tag.end <= start) {
      index = start + 1;
      continue;
    }
    index = tag.end;
    if (tag.name === 'svg' && !tag.selfClosing) svg += 1;
    if (tag.name === 'title' && svg === 0 && !tag.selfClosing) {
      const inner = takeUntil(src, index, 'title');
      facts.titles.push(collapse(inner.text));
      index = inner.end;
      continue;
    }
    if (tag.name === 'script' && !tag.selfClosing) {
      const inner = takeUntil(src, index, 'script');
      if (isJsonLd(tag.attrs.get('type') ?? '')) {
        facts.jsonld.push(inner.text.trim());
      }
      index = inner.end;
      continue;
    }
    if (tag.name === 'meta') readMeta(tag, facts);
    if (tag.name === 'link') readLink(tag, facts);
  }
  return facts;
}

function readMeta(tag: Tag, facts: PageFacts): void {
  const name = (tag.attrs.get('name') ?? '').toLowerCase();
  const content = tag.attrs.get('content') ?? '';
  if (name === 'description') facts.descriptions.push(collapse(content));
  if (name === 'robots') facts.metaRobots.push({ agent: '*', content });
  if (name === 'googlebot') {
    facts.metaRobots.push({ agent: 'googlebot', content });
  }
}

function readLink(tag: Tag, facts: PageFacts): void {
  const rel = (tag.attrs.get('rel') ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (rel.includes('canonical')) {
    facts.canonicals.push(decodeEntities(tag.attrs.get('href') ?? ''));
  }
  if (rel.includes('alternate') && tag.attrs.has('hreflang')) {
    facts.hreflangs.push({
      lang: (tag.attrs.get('hreflang') ?? '').trim().toLowerCase(),
      href: decodeEntities(tag.attrs.get('href') ?? ''),
    });
  }
}

function isJsonLd(type: string): boolean {
  return type.split(';')[0]?.trim().toLowerCase() === 'application/ld+json';
}

function takeUntil(
  src: string,
  from: number,
  name: string,
): { text: string; end: number } {
  const re = new RegExp(`</${name}\\s*>`, 'i');
  const match = re.exec(src.slice(from));
  if (!match || match.index === undefined) {
    return { text: src.slice(from), end: src.length };
  }
  return {
    text: src.slice(from, from + match.index),
    end: from + match.index + match[0].length,
  };
}

function readClose(src: string, start: number): { name: string; end: number } {
  let index = start + 2;
  const nameStart = index;
  while (index < src.length && /[A-Za-z0-9:-]/.test(src[index] ?? ''))
    index += 1;
  const name = src.slice(nameStart, index).toLowerCase();
  const end = src.indexOf('>', index);
  return { name, end: end === -1 ? src.length : end + 1 };
}

function readTag(src: string, start: number): Tag | null {
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
        while (index < src.length && !/[\s>]/.test(src[index] ?? ''))
          index += 1;
        value = src.slice(valueStart, index);
      }
    }
    if (attrName !== '' && !attrs.has(attrName)) attrs.set(attrName, value);
  }
  return { name, end: index, selfClosing, attrs };
}
