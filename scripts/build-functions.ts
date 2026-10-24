#!/usr/bin/env node
/**
 * Bundle complet des fonctions Netlify (paquets du monorepo en TypeScript).
 * Le bundler de Netlify laisse les dépendances externes : Node ne lit pas
 * leurs sources `.ts`. Sortie : netlify/dist/functions (ignorée par Git).
 */
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const source = 'netlify/functions';
export const FUNCTIONS_OUT = 'netlify/dist/functions';

export async function buildFunctions(
  root = process.cwd(),
  outdir = path.join(root, FUNCTIONS_OUT),
) {
  const dir = path.join(root, source);
  const entries = (await readdir(dir))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(dir, file));
  await rm(outdir, { recursive: true, force: true });
  await build({
    absWorkingDir: root,
    entryPoints: entries,
    outdir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outExtension: { '.js': '.mjs' },
    banner: {
      js: "import { createRequire as __audigyRequire } from 'node:module';\nconst require = __audigyRequire(import.meta.url);",
    },
    logLevel: 'warning',
  });
  return entries.map((file) => path.basename(file, '.ts'));
}

const entry = process.argv[1];
if (entry && path.resolve(entry) === path.resolve(import.meta.filename)) {
  const names = await buildFunctions();
  console.log(`fonctions : ${names.join(', ')}`);
}
