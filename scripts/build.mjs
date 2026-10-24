import { spawn } from 'node:child_process';
import { access, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandOptions, loadRootEnv } from './dev-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = 'apps/web/dist';
const devPage = path.join(dist, 'dev/composants/index.html');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, commandOptions());
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} a échoué (${code ?? 'signal'})`,
          ),
        );
    });
  });
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

function refsIn(text) {
  const refs = [];
  const pattern = /["'(]((?:\/|\.\/)[^"'()\s]+)["')]/g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1];
    if (raw) refs.push(raw);
  }
  return refs;
}

async function pruneUnreferenced(root) {
  const files = await walk(root);
  const byPath = new Map(files.map((file) => [path.resolve(file), file]));
  const html = files.filter((file) => file.endsWith('.html'));
  const keep = new Set(html.map((file) => path.resolve(file)));
  const queue = [...html];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const text = await readFile(current, 'utf8');
    for (const ref of refsIn(text)) {
      if (
        ref.startsWith('data:') ||
        ref.startsWith('http:') ||
        ref.startsWith('https:') ||
        ref.startsWith('#')
      ) {
        continue;
      }
      const clean = ref.split('?')[0]?.split('#')[0] ?? '';
      if (!clean) continue;
      const target = clean.startsWith('/')
        ? path.resolve(root, `.${clean}`)
        : path.resolve(path.dirname(current), clean);
      if (!byPath.has(target) || keep.has(target)) continue;
      keep.add(target);
      if (
        target.endsWith('.css') ||
        target.endsWith('.js') ||
        target.endsWith('.html')
      )
        queue.push(target);
    }
  }
  for (const file of files) {
    const rel = path.relative(root, file);
    if (
      rel.startsWith(`preuves${path.sep}`) ||
      rel.startsWith(`.well-known${path.sep}`)
    ) {
      keep.add(path.resolve(file));
    }
  }
  const removed = [];
  for (const file of files) {
    const resolved = path.resolve(file);
    if (keep.has(resolved)) continue;
    await rm(file);
    removed.push(file);
  }
  return removed;
}

await loadRootEnv(root);
await run('pnpm', ['--filter', '@audigy/web', 'build']);
await run('node', ['scripts/build-functions.ts']);
await rm(path.join(dist, 'dev'), { recursive: true, force: true });

let leaked = true;
try {
  await access(devPage);
} catch (error) {
  if (error && error.code === 'ENOENT') leaked = false;
  else throw error;
}
if (leaked) {
  throw new Error(
    'La page /dev/composants est présente dans le build de production.',
  );
}

await pruneUnreferenced(dist);
await access(path.join(dist, 'index.html'));
await access(path.join(dist, '.well-known', 'audigy-signing-key'));
const preuves = await readdir(path.join(dist, 'preuves'));
if (!preuves.some((name) => name.endsWith('.json'))) {
  throw new Error('dossier de preuve absent du build');
}

let stillThere = true;
try {
  await access(devPage);
} catch (error) {
  if (error && error.code === 'ENOENT') stillThere = false;
  else throw error;
}
if (stillThere)
  throw new Error(
    'La page /dev/composants est présente dans le build de production.',
  );
