import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIX_ID_RE, type FixStore } from './fixes.js';

/** Dossier des fiches françaises du moteur. */
export const FIXES_FR_DIR = fileURLToPath(
  new URL('../fixes/fr/', import.meta.url),
);

/** Adaptateur disque : `<dir>/<check-id>.md`. Hors du cœur pur du moteur. */
export function fileFixStore(dir: string = FIXES_FR_DIR): FixStore {
  return {
    async list() {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name.slice(0, -'.md'.length));
    },
    async read(id) {
      if (!FIX_ID_RE.test(id)) throw new Error(`Identifiant invalide : ${id}`);
      return readFile(path.join(dir, `${id}.md`), 'utf8');
    },
  };
}
