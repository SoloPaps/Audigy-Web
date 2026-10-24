#!/usr/bin/env node
/**
 * Bundle complet des fonctions Netlify (paquets du monorepo en TypeScript).
 * Le bundler de Netlify laisse les dépendances externes : Node ne lit pas
 * leurs sources `.ts`. Sortie : netlify/dist/functions (ignorée par Git).
 */
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { build, type Plugin } from 'esbuild';

const source = 'netlify/functions';
export const FUNCTIONS_OUT = 'netlify/dist/functions';

/** POSIX (`/`) et Windows (`\`) : esbuild garde les séparateurs du système. */
export const TRACKERS_MODULE =
  /packages[/\\]engine[/\\]checks[/\\]vie_privee[/\\]trackers\.ts$/;
const TRACKERS_READ = "readFileSync(FILE, 'utf8')";

/**
 * La liste de traceurs est lue à côté du module (`import.meta.url`), chemin perdu
 * dans le bundle : on l'inline. Échoue si le moteur change sa façon de la lire.
 */
export const inlineTrackers: Plugin = {
  name: 'audigy-inline-trackers',
  setup(b) {
    b.onLoad({ filter: TRACKERS_MODULE }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      if (!source.includes(TRACKERS_READ))
        throw new Error('trackers.ts : lecture de la liste introuvable');
      const list = await readFile(
        path.resolve(
          path.dirname(args.path),
          '../../data/trackers/domains.txt',
        ),
        'utf8',
      );
      return {
        contents: source.replace(TRACKERS_READ, JSON.stringify(list)),
        loader: 'ts',
      };
    });
  },
};

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
    plugins: [inlineTrackers],
  });
  return entries.map((file) => path.basename(file, '.ts'));
}

const entry = process.argv[1];
if (entry && path.resolve(entry) === path.resolve(import.meta.filename)) {
  const names = await buildFunctions();
  console.log(`fonctions : ${names.join(', ')}`);
}
