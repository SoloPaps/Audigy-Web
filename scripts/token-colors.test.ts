import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve('apps/web');
const TOKEN_FILE = path.normalize('apps/web/src/styles/tokens.css');

const ALLOWED_HEX = new Set(
  [
    '#faf8f4',
    '#ffffff',
    '#1b1f24',
    '#4a5260',
    '#e3ded5',
    '#0f5c5a',
    '#c2410c',
    '#1f5fad',
    '#e6eef8',
    '#9a5800',
    '#fbf0de',
    '#b3261e',
    '#fbe7e5',
    '#5f6672',
    '#f1f1ef',
    '#15181c',
    '#1d2126',
    '#ece9e3',
    '#a9b0ba',
    '#2e343b',
    '#5fc1bc',
    '#7fb0ee',
    '#e8a64a',
    '#f08a80',
    '#1c314c',
    '#3a2c14',
    '#3a2220',
    '#2a2e33',
    '#c5cad1',
  ].map((hex) => hex.toLowerCase()),
);

const ALLOWED_RGB = 'rgb(0 0 0 / 0.08)';
const HEX =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
const NAMED =
  /(?<![\w-])(?:aliceblue|black|blue|brown|cyan|gold|gray|grey|green|indigo|ivory|lime|magenta|maroon|navy|olive|orange|pink|purple|red|silver|teal|violet|white|yellow)(?![\w-])/i;

async function filesUnder(dir: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.astro'
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(full)));
    else if (/\.(css|svelte|astro|js)$/.test(entry.name)) found.push(full);
  }
  return found;
}

function styleChunks(file: string, text: string): string[] {
  if (file.endsWith('.css')) return [text];
  const chunks: string[] = [];
  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    const block = match[1];
    if (block) chunks.push(block);
  }
  for (const match of text.matchAll(/\sstyle=\{`([^`]*)`\}/g)) {
    const block = match[1];
    if (block) chunks.push(block);
  }
  for (const match of text.matchAll(/\sstyle="([^"]*)"/g)) {
    const block = match[1];
    if (block) chunks.push(block);
  }
  return chunks;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

describe('couleurs des CSS', () => {
  it('refuse une couleur hors tokens', async () => {
    const violations: string[] = [];
    for (const file of await filesUnder(ROOT)) {
      const text = await readFile(file, 'utf8');
      const relative = path.relative(process.cwd(), file);
      const isTokens = path.normalize(relative) === TOKEN_FILE;
      const chunks =
        isTokens || file.endsWith('.js') ? [text] : styleChunks(file, text);
      for (const chunk of chunks) {
        for (const match of chunk.matchAll(HEX)) {
          const hex = match[0].toLowerCase();
          if (!isTokens || !ALLOWED_HEX.has(hex)) {
            violations.push(
              `${relative}:${lineOf(chunk, match.index ?? 0)} ${hex}`,
            );
          }
        }
        for (const match of chunk.matchAll(COLOR_FN)) {
          const around = chunk.slice(match.index ?? 0, (match.index ?? 0) + 40);
          if (!(isTokens && around.startsWith(ALLOWED_RGB))) {
            violations.push(
              `${relative}:${lineOf(chunk, match.index ?? 0)} ${match[0]}`,
            );
          }
        }
        if (!isTokens && NAMED.test(chunk)) {
          violations.push(`${relative} couleur nommée`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('refuse px, dégradé, ombre ou capitales hors tokens', async () => {
    const violations: string[] = [];
    for (const file of await filesUnder(ROOT)) {
      const relative = path.relative(process.cwd(), file);
      if (path.normalize(relative) === TOKEN_FILE) continue;
      const text = await readFile(file, 'utf8');
      for (const chunk of styleChunks(file, text)) {
        const lines = chunk.split('\n');
        for (const [index, line] of lines.entries()) {
          if (line.includes('@media')) continue;
          if (/\d+px\b/.test(line))
            violations.push(`${relative}:${index + 1} ${line.trim()}`);
          if (
            /linear-gradient|radial-gradient|backdrop-filter|blur\(/.test(line)
          ) {
            violations.push(`${relative}:${index + 1} effet interdit`);
          }
          if (/text-transform\s*:\s*uppercase/.test(line)) {
            violations.push(`${relative}:${index + 1} capitales`);
          }
          if (/box-shadow/.test(line))
            violations.push(`${relative}:${index + 1} ombre`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
