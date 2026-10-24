#!/usr/bin/env node
/**
 * Échoue si un workflow, un script package.json ou netlify.toml
 * prépare un déploiement ou une liaison Netlify.
 * Ne lit pas le reste du dépôt (la doc cite ces chaînes).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.netlify',
  '.astro',
]);

export interface Violation {
  file: string;
  rule: string;
}

export const RULES: { id: string; re: RegExp }[] = [
  { id: 'netlify-deploy', re: /netlify\s+deploy\b/ },
  { id: 'actions-netlify', re: /nwtgck\/actions-netlify/ },
  { id: 'auth-token', re: /NETLIFY_AUTH_TOKEN/ },
  { id: 'build-hook', re: /build[_-]hooks?\b/i },
  {
    id: 'deploy-context',
    re: /\[context\.(?:production|deploy-preview|branch-deploy|preview)\]|\bdeploy-preview\b|\bbranch-deploy\b/,
  },
  { id: 'netlify-link', re: /\bnetlify\s+link\b/ },
];

export function violationsInText(text: string, file: string): Violation[] {
  const hits: Violation[] = [];
  for (const rule of RULES) {
    if (rule.re.test(text)) hits.push({ file, rule: rule.id });
  }
  return hits;
}

function isWorkflow(file: string): boolean {
  const parts = file.split(path.sep);
  const index = parts.lastIndexOf('.github');
  return index >= 0 && parts[index + 1] === 'workflows';
}

async function walk(dir: string, files: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
      continue;
    }
    if (
      entry.name === 'package.json' ||
      entry.name === 'netlify.toml' ||
      isWorkflow(full)
    ) {
      files.push(full);
    }
  }
}

function violationsInPackage(text: string, file: string): Violation[] {
  let data: { scripts?: Record<string, unknown> };
  try {
    data = JSON.parse(text) as { scripts?: Record<string, unknown> };
  } catch {
    return [{ file, rule: 'invalid-package-json' }];
  }
  const scripts = data.scripts ?? {};
  const body = Object.entries(scripts)
    .map(([key, value]) => `${key}\n${typeof value === 'string' ? value : ''}`)
    .join('\n');
  return violationsInText(body, file);
}

export async function scan(root: string): Promise<Violation[]> {
  const files: string[] = [];
  await walk(root, files);
  const hits: Violation[] = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const rel = path.relative(root, file);
    if (path.basename(file) === 'package.json') {
      hits.push(...violationsInPackage(text, rel));
    } else {
      hits.push(...violationsInText(text, rel));
    }
  }
  if (await isLinked(path.join(root, '.netlify', 'state.json'))) {
    hits.push({ file: '.netlify/state.json', rule: 'netlify-link' });
  }
  return hits;
}

/** `netlify dev` écrit aussi ce fichier ; seul un `siteId` signe une liaison. */
async function isLinked(file: string): Promise<boolean> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(text) as { siteId?: unknown };
    return data.siteId !== undefined;
  } catch {
    return true;
  }
}

const entry = process.argv[1];
const isMain =
  entry !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entry)).href;

if (isMain) {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const hits = await scan(root);
  if (hits.length > 0) {
    console.error('guard-no-deploy: déploiement ou liaison Netlify interdit');
    for (const hit of hits) console.error(`- ${hit.file}: ${hit.rule}`);
    process.exit(1);
  }
}
