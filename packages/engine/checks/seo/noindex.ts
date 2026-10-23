import type { Check } from '../../src/types.js';
import { loadHome } from '../securite/shared.js';
import { type MetaRobots, parseHtml } from './html.js';
import { finding, isPageHtml, pageStatus } from './shared.js';

const ID = 'seo.noindex';

const KNOWN = new Set([
  'all',
  'follow',
  'index',
  'max-image-preview',
  'max-snippet',
  'max-video-preview',
  'noarchive',
  'nofollow',
  'noimageindex',
  'noindex',
  'none',
  'nosnippet',
  'nositelinkssearchbox',
  'notranslate',
  'rating',
  'unavailable_after',
]);

export function blocksIndex(
  metas: readonly MetaRobots[],
  header: string | null,
): boolean {
  for (const meta of metas) {
    if (contentBlocks(meta.content, meta.agent)) return true;
  }
  return headerBlocks(header);
}

export const noindexCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    const res = await loadHome(ctx);
    if (res.status !== 200) return pageStatus(ID, res);
    const header = res.headers.get('x-robots-tag');
    const metas = isPageHtml(res) ? parseHtml(res.text()).metaRobots : [];
    const blocked = blocksIndex(metas, header);
    const source = blocked ? sourceOf(metas, header) : 'none';
    const measured = { source, status: res.status };
    if (blocked) {
      return finding(ID, 'fail', 4, 3, 'seo.noindex.fail', { measured });
    }
    return finding(ID, 'pass', 1, 1, 'seo.noindex.pass', { measured });
  },
};

function sourceOf(metas: readonly MetaRobots[], header: string | null): string {
  const meta = metas.some((item) => contentBlocks(item.content, item.agent));
  const fromHeader = headerBlocks(header);
  if (meta && fromHeader) return 'both';
  return fromHeader ? 'header' : 'meta';
}

function contentBlocks(content: string, agent: string): boolean {
  if (!agentMatches(agent)) return false;
  return content.split(',').some((part) => {
    const name = directiveName(part);
    return name === 'noindex' || name === 'none';
  });
}

function headerBlocks(header: string | null): boolean {
  if (header === null || header.trim() === '') return false;
  let agent = '*';
  for (const part of header.split(',')) {
    const text = part.trim();
    if (text === '') continue;
    let body = text;
    const colon = text.indexOf(':');
    if (colon !== -1) {
      const left = text.slice(0, colon).trim().toLowerCase();
      if (!KNOWN.has(left)) {
        agent = left;
        body = text.slice(colon + 1).trim();
      }
    }
    if (body === '') continue;
    const name = directiveName(body);
    if ((name === 'noindex' || name === 'none') && agentMatches(agent)) {
      return true;
    }
  }
  return false;
}

function directiveName(token: string): string {
  const lower = token.trim().toLowerCase();
  const colon = lower.indexOf(':');
  return (colon === -1 ? lower : lower.slice(0, colon)).trim();
}

function agentMatches(agent: string): boolean {
  if (agent === '*' || agent === '') return true;
  return 'googlebot'.startsWith(agent.toLowerCase());
}
