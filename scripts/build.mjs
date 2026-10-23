import { mkdir, writeFile } from 'node:fs/promises';

const out = 'apps/web/dist';
await mkdir(out, { recursive: true });
await writeFile(
  `${out}/index.html`,
  '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Audigy</title></html>\n',
);
