import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pruneUnreferenced } from './prune-dist.mjs';

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('pruneUnreferenced', () => {
  it('garde dictionnaire-en.json chargé seulement par fetch', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'audigy-prune-'));
    dirs.push(root);
    await writeFile(path.join(root, 'index.html'), '<html></html>');
    await writeFile(path.join(root, 'dictionnaire-en.json'), '{}');
    await writeFile(path.join(root, 'orphelin.txt'), 'x');
    await mkdir(path.join(root, 'preuves'), { recursive: true });
    await writeFile(path.join(root, 'preuves', 'preuve.json'), '{}');

    const removed = await pruneUnreferenced(root);

    expect(removed.map((file) => path.basename(file))).toEqual([
      'orphelin.txt',
    ]);
    await access(path.join(root, 'dictionnaire-en.json'));
    await access(path.join(root, 'preuves', 'preuve.json'));
    await expect(access(path.join(root, 'orphelin.txt'))).rejects.toThrow();
  });
});
