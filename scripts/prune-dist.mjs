import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

/** Fichiers de `public/` chargés hors HTML (fetch runtime). */
const KEEP_ROOT = new Set(['robots.txt', 'dictionnaire-en.json']);

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

export async function pruneUnreferenced(root) {
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
      KEEP_ROOT.has(rel) ||
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
