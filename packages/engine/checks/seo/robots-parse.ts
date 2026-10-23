export interface RobotRule {
  allow: boolean;
  path: string;
}

export interface RobotGroup {
  agents: string[];
  rules: RobotRule[];
}

export interface RobotsFile {
  groups: RobotGroup[];
  sitemaps: string[];
}

const CRAWLER = 'googlebot';

/** Analyse un `robots.txt` (groupes, Allow/Disallow, Sitemap). */
export function parseRobots(text: string): RobotsFile {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const groups: RobotGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotGroup | null = null;

  for (const raw of src.split('\n')) {
    const hash = raw.indexOf('#');
    const line = (hash === -1 ? raw : raw.slice(0, hash)).trim();
    if (line === '') {
      if (current && current.rules.length > 0) current = null;
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (name === 'user-agent') {
      if (value === '') continue;
      if (current && current.rules.length > 0) current = null;
      if (!current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (name === 'sitemap') {
      if (value !== '') sitemaps.push(value);
      continue;
    }
    if (
      (name === 'allow' || name === 'disallow') &&
      current &&
      (value.startsWith('/') || value.startsWith('*'))
    ) {
      current.rules.push({ allow: name === 'allow', path: value });
    }
  }
  return { groups, sitemaps };
}

/**
 * Le chemin est-il autorisé pour Googlebot ?
 * Le groupe le plus précis l’emporte. À longueur égale, Allow l’emporte.
 */
export function googlebotAllowed(file: RobotsFile, url: URL): boolean {
  let best = -1;
  for (const group of file.groups) {
    for (const agent of group.agents) {
      const score = agentScore(agent);
      if (score > best) best = score;
    }
  }
  if (best < 0) return true;
  const rules: RobotRule[] = [];
  for (const group of file.groups) {
    if (group.agents.some((agent) => agentScore(agent) === best)) {
      rules.push(...group.rules);
    }
  }
  const path = `${url.pathname}${url.search}`;
  let winner: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (!ruleMatches(rule.path, path)) continue;
    const length = rule.path.length;
    if (
      winner === null ||
      length > winner.length ||
      (length === winner.length && rule.allow && !winner.allow)
    ) {
      winner = { allow: rule.allow, length };
    }
  }
  return winner ? winner.allow : true;
}

export function ruleMatches(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  let expression = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const ch = pattern[index] ?? '';
    if (ch === '*') expression += '.*';
    else if (ch === '$' && index === pattern.length - 1) expression += '$';
    else expression += escapeRegex(ch);
  }
  return new RegExp(expression).test(path);
}

/** Adresses de plan citées dans le fichier, absolues ou en chemin. */
export function sitemapLinks(text: string, base: URL): URL[] {
  const urls: URL[] = [];
  for (const item of parseRobots(text).sitemaps) {
    const url = publicHttpUrl(item, base);
    if (url) urls.push(url);
  }
  return urls;
}

export function publicHttpUrl(value: string, base?: URL): URL | null {
  const trimmed = value.trim();
  try {
    const url = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : trimmed.startsWith('/') && base
        ? new URL(trimmed, base.origin)
        : null;
    if (!url) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    const port =
      url.port === ''
        ? url.protocol === 'https:'
          ? 443
          : 80
        : Number(url.port);
    if (port !== 80 && port !== 443) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function agentScore(agent: string): number {
  if (agent === '*') return 0;
  if (CRAWLER.startsWith(agent)) return agent.length;
  return -1;
}

function escapeRegex(ch: string): string {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch;
}
