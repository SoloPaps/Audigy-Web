#!/usr/bin/env node
/**
 * Recopie les extracteurs de retire.js (Apache-2.0) dans packages/engine/data/retire/.
 * Usage : node scripts/update-retire-signatures.ts [commit]
 * Seuls les extracteurs sont gardés : les failles viennent d’OSV, pas de retire.js.
 * Jamais lancé en CI : les tests lisent la copie versionnée.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO = 'RetireJS/retire.js';
const DEFAULT_COMMIT = 'e5e228659bbcaea7ba85536a2ef8d4fb97b366e9';
const OUT = path.join('packages', 'engine', 'data', 'retire');
const KEPT = [
  'uri',
  'filename',
  'filecontent',
  'filecontentreplace',
  'hashes',
] as const;
const SKIPPED = new Set(['retire-example', 'dont check']);

interface RetireLibrary {
  extractors?: Record<string, unknown>;
}

async function download(commit: string, file: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file} : HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const commit = process.argv[2] ?? DEFAULT_COMMIT;
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('commit invalide');
  const [repository, license, notice] = await Promise.all([
    download(commit, 'repository/jsrepository-master.json'),
    download(commit, 'LICENSE.md'),
    download(commit, 'NOTICE.md'),
  ]);
  if (!license.includes('Apache License') || !license.includes('2.0')) {
    throw new Error('licence inattendue : vérifiez avant de copier');
  }
  const source = JSON.parse(repository) as Record<string, RetireLibrary>;
  const libraries: Record<string, Record<string, unknown>> = {};
  for (const name of Object.keys(source).sort()) {
    if (SKIPPED.has(name)) continue;
    const extractors = source[name]?.extractors ?? {};
    const kept: Record<string, unknown> = {};
    for (const kind of KEPT) {
      const value = extractors[kind];
      if (Array.isArray(value) && value.length > 0) kept[kind] = value;
      if (
        kind === 'hashes' &&
        value &&
        typeof value === 'object' &&
        Object.keys(value).length > 0
      )
        kept[kind] = value;
    }
    if (Object.keys(kept).length > 0) libraries[name] = kept;
  }
  const data = {
    source: `https://github.com/${REPO}/blob/${commit}/repository/jsrepository-master.json`,
    commit,
    license: 'Apache-2.0',
    copyright: 'Copyright 2018 Erlend Oftedal',
    changes:
      'Modifié par Audigy : extracteurs uri, filename, filecontent, filecontentreplace et hashes seulement. Failles, licences et extracteurs func retirés.',
    libraries,
  };
  await mkdir(OUT, { recursive: true });
  const target = path.join(OUT, 'signatures.json');
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(path.join(OUT, 'LICENSE.md'), license);
  await writeFile(
    path.join(OUT, 'NOTICE.md'),
    `${notice.trimEnd()}\n\n---\n\nsignatures.json est dérivé de repository/jsrepository-master.json\n(${REPO}, commit ${commit}). Audigy n’en garde que les extracteurs.\n`,
  );
  execFileSync('pnpm', ['exec', 'biome', 'format', '--write', target], {
    stdio: 'inherit',
  });
  console.log(`${Object.keys(libraries).length} bibliothèques → ${target}`);
}

await main();
