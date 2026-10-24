#!/usr/bin/env node
/**
 * Relit le texte visible de apps/web.
 * Erreurs : emoji, mots en capitales, mots marketing.
 * Avertissement : phrase de plus de 20 mots (ne fait pas échouer).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.astro',
  '.netlify',
  'coverage',
]);
const SOURCE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.astro',
  '.svelte',
  '.html',
]);
const MARKUP_EXT = new Set(['.astro', '.svelte', '.html']);

/** Sigles attendus dans l'interface. Le reste en capitales est un titre crié. */
const ACRONYMS = new Set([
  'ANSSI',
  'AVIF',
  'CISA',
  'CNIL',
  'DKIM',
  'DMARC',
  'DNSSEC',
  'GDPR',
  'HSTS',
  'HTML',
  'HTTP',
  'HTTPS',
  'JPEG',
  'JSON',
  'RGAA',
  'RGESN',
  'RGPD',
  'WARC',
  'WCAG',
  'WEBP',
]);

const FORBIDDEN =
  /(?<![\p{L}\p{N}])(révolutionnaire|révolutionnez|révolutionner|propulsez|propulser|propulse|sublimez|sublimer|sublime|boostez|booster|booste|boost)(?![\p{L}\p{N}])/giu;

const PHRASES = [
  'en un clic magique',
  'en toute simplicité',
  'nouvelle génération',
];

export interface CopyIssue {
  file: string;
  line: number;
  rule: 'emoji' | 'caps' | 'forbidden' | 'sentence-length';
  level: 'error' | 'warning';
  excerpt: string;
}

interface Span {
  value: string;
  line: number;
}

export function failureCount(issues: CopyIssue[]): number {
  return issues.filter((issue) => issue.level === 'error').length;
}

export function lintText(text: string, file: string, line = 1): CopyIssue[] {
  const issues: CopyIssue[] = [];
  for (const index of emojiIndexes(text)) {
    issues.push(
      issue(file, lineOf(text, index, line), 'emoji', 'error', text, index),
    );
  }
  for (const hit of forbiddenHits(text)) {
    issues.push(
      issue(
        file,
        lineOf(text, hit.index, line),
        'forbidden',
        'error',
        text,
        hit.index,
      ),
    );
  }
  for (const hit of capsHits(text)) {
    issues.push(
      issue(
        file,
        lineOf(text, hit.index, line),
        'caps',
        'error',
        text,
        hit.index,
      ),
    );
  }
  for (const span of sentenceSpans(text)) {
    const sentence = text.slice(span.start, span.end);
    const count = wordCount(sentence);
    if (count > 20) {
      issues.push({
        file,
        line: lineOf(text, span.start, line),
        rule: 'sentence-length',
        level: 'warning',
        excerpt: `${count} mots`,
      });
    }
  }
  return issues;
}

export function lintSource(source: string, file: string): CopyIssue[] {
  const ext = path.extname(file);
  const cleaned = stripMarkupComments(source, ext);
  const issues = spansOf(cleaned)
    .flatMap((span) => lintText(span.value, file, span.line))
    .concat(
      markupSpans(cleaned, ext).flatMap((span) =>
        lintText(span.value, file, span.line),
      ),
    );
  issues.sort(byLocation);
  return issues;
}

export async function scan(root: string): Promise<CopyIssue[]> {
  const web = path.join(root, 'apps', 'web');
  const files: string[] = [];
  try {
    await walk(web, files);
  } catch {
    return [];
  }
  const copy = path.join(root, 'packages', 'orchestrator', 'src', 'copy.ts');
  try {
    await readFile(copy, 'utf8');
    files.push(copy);
  } catch {
    // gabarits d'e-mail absents
  }
  const issues: CopyIssue[] = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    issues.push(...lintSource(source, path.relative(root, file)));
  }
  issues.sort(byLocation);
  return issues;
}

function issue(
  file: string,
  line: number,
  rule: CopyIssue['rule'],
  level: CopyIssue['level'],
  text: string,
  index: number,
): CopyIssue {
  const raw = text
    .slice(Math.max(0, index - 24), index + 48)
    .replace(/\s+/g, ' ')
    .trim();
  return {
    file,
    line,
    rule,
    level,
    excerpt: raw.length > 72 ? `${raw.slice(0, 69)}…` : raw,
  };
}

function byLocation(a: CopyIssue, b: CopyIssue): number {
  return (
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.rule.localeCompare(b.rule)
  );
}

function lineOf(text: string, index: number, base: number): number {
  let line = base;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function emojiIndexes(text: string): number[] {
  const indexes: number[] = [];
  const re = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F/gu;
  for (const match of text.matchAll(re)) {
    const ch = match[0];
    if (ch === undefined || match.index === undefined) continue;
    if (ch === '©' || ch === '®' || ch === '™') continue;
    indexes.push(match.index);
  }
  return indexes;
}

function forbiddenHits(text: string): { index: number }[] {
  const hits: { index: number }[] = [];
  const lower = text.toLocaleLowerCase('fr-FR');
  for (const phrase of PHRASES) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(phrase, from);
      if (index < 0) break;
      hits.push({ index });
      from = index + phrase.length;
    }
  }
  FORBIDDEN.lastIndex = 0;
  for (const match of text.matchAll(FORBIDDEN)) {
    if (match.index !== undefined) hits.push({ index: match.index });
  }
  return hits;
}

function capsHits(text: string): { index: number }[] {
  const hits: { index: number }[] = [];
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const word = match[0];
    if (word === undefined || word.length < 4 || match.index === undefined)
      continue;
    if (ACRONYMS.has(word)) continue;
    let upper = true;
    for (const ch of word) {
      if (ch.toLocaleLowerCase('fr-FR') === ch) {
        upper = false;
        break;
      }
    }
    if (upper) hits.push({ index: match.index });
  }
  return hits;
}

function wordCount(sentence: string): number {
  const trimmed = sentence.replace(/[.!?…]+$/u, '').trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/u).length;
}

function sentenceSpans(text: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  let start = 0;
  for (const match of text.matchAll(/[.!?…]+/g)) {
    const punct = match[0];
    const index = match.index;
    if (punct === undefined || index === undefined) continue;
    const end = index + punct.length;
    if (punct === '.' && isAbbreviation(text, index)) continue;
    const chunkStart = skipSpace(text, start);
    if (chunkStart < end) spans.push({ start: chunkStart, end });
    start = end;
  }
  const rest = skipSpace(text, start);
  if (rest < text.length) spans.push({ start: rest, end: text.length });
  return spans;
}

function skipSpace(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/u.test(text[i] ?? '')) i += 1;
  return i;
}

function isAbbreviation(text: string, periodIndex: number): boolean {
  const prev = text[periodIndex - 1] ?? '';
  const nextRaw = text[periodIndex + 1] ?? '';
  if (/\p{N}/u.test(prev) && /\p{N}/u.test(nextRaw)) return true;
  let i = periodIndex - 1;
  let letters = 0;
  while (i >= 0 && /\p{L}/u.test(text[i] ?? '')) {
    letters += 1;
    i -= 1;
  }
  if (letters < 1 || letters > 4) return false;
  const after = /^\s*(\p{L}|\p{N})/u.exec(text.slice(periodIndex + 1));
  const next = after?.[1];
  if (next === undefined) return false;
  if (/\p{N}/u.test(next)) return true;
  return next === next.toLocaleLowerCase('fr-FR');
}

function stripMarkupComments(source: string, ext: string): string {
  if (!MARKUP_EXT.has(ext)) return source;
  return source.replace(/<!--[\s\S]*?-->/g, (block) =>
    block.replace(/[^\n]/g, ' '),
  );
}

function markupSpans(source: string, ext: string): Span[] {
  if (!MARKUP_EXT.has(ext)) return [];
  let text = source;
  if (ext === '.astro') {
    text = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, (block) =>
      block.replace(/[^\n]/g, ' '),
    );
  }
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, blank);
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank);
  text = text.replace(/<[^>]*>/g, blank);
  text = blankBraces(text);
  if (text.trim().length === 0) return [];
  return [{ value: text, line: 1 }];
}

function blank(block: string): string {
  return block.replace(/[^\n]/g, ' ');
}

/** Retire `{...}` (Svelte, Astro) : ce n’est pas du texte visible. */
function blankBraces(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] !== '{') {
      out += source[i] ?? '';
      i += 1;
      continue;
    }
    const start = i;
    let depth = 0;
    while (i < source.length) {
      const ch = source[i] ?? '';
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      i += 1;
      if (depth === 0) break;
    }
    out += blank(source.slice(start, i));
  }
  return out;
}

function spansOf(source: string): Span[] {
  const spans: Span[] = [];
  let i = 0;
  let line = 1;

  const bump = (ch: string): void => {
    if (ch === '\n') line += 1;
  };

  const scanCode = (stopAtBrace: boolean): void => {
    let depth = stopAtBrace ? 1 : 0;
    while (i < source.length) {
      const ch = source[i] ?? '';
      if (stopAtBrace && ch === '{') {
        depth += 1;
        i += 1;
        continue;
      }
      if (stopAtBrace && ch === '}') {
        depth -= 1;
        i += 1;
        if (depth === 0) return;
        continue;
      }
      if (ch === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i += 1;
        continue;
      }
      if (ch === '/' && source[i + 1] === '*') {
        i += 2;
        while (
          i < source.length &&
          !(source[i] === '*' && source[i + 1] === '/')
        ) {
          bump(source[i] ?? '');
          i += 1;
        }
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"') {
        readQuoted(ch, spans);
        continue;
      }
      if (ch === '`') {
        i += 1;
        readTemplate(spans);
        continue;
      }
      bump(ch);
      i += 1;
    }
  };

  const readQuoted = (quote: string, out: Span[]): void => {
    const startLine = line;
    i += 1;
    let value = '';
    while (i < source.length && source[i] !== quote) {
      if (source[i] === '\\') {
        const decoded = decodeEscape(source, i);
        value += decoded.value;
        while (i < decoded.next) {
          bump(source[i] ?? '');
          i += 1;
        }
        continue;
      }
      bump(source[i] ?? '');
      value += source[i] ?? '';
      i += 1;
    }
    i += 1;
    out.push({ value, line: startLine });
  };

  const readTemplate = (out: Span[]): void => {
    const startLine = line;
    let value = '';
    while (i < source.length) {
      const ch = source[i] ?? '';
      if (ch === '\\') {
        const decoded = decodeEscape(source, i);
        value += decoded.value;
        while (i < decoded.next) {
          bump(source[i] ?? '');
          i += 1;
        }
        continue;
      }
      if (ch === '`') {
        i += 1;
        if (value.length > 0) out.push({ value, line: startLine });
        return;
      }
      if (ch === '$' && source[i + 1] === '{') {
        if (value.length > 0) out.push({ value, line: startLine });
        value = '';
        i += 2;
        scanCode(true);
        continue;
      }
      bump(ch);
      value += ch;
      i += 1;
    }
  };

  scanCode(false);
  return spans;
}

function decodeEscape(
  source: string,
  index: number,
): { value: string; next: number } {
  const next = source[index + 1] ?? '';
  if (next === 'n') return { value: '\n', next: index + 2 };
  if (next === 'r') return { value: '\r', next: index + 2 };
  if (next === 't') return { value: '\t', next: index + 2 };
  if (next === 'u' && source[index + 2] === '{') {
    const end = source.indexOf('}', index + 3);
    const hex = end > index ? source.slice(index + 3, end) : '';
    const code = Number.parseInt(hex, 16);
    if (end > index && /^[0-9a-fA-F]+$/.test(hex) && Number.isFinite(code)) {
      return { value: String.fromCodePoint(code), next: end + 1 };
    }
  }
  if (next === 'u') {
    const hex = source.slice(index + 2, index + 6);
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      return {
        value: String.fromCharCode(Number.parseInt(hex, 16)),
        next: index + 6,
      };
    }
  }
  return { value: next, next: index + 2 };
}

function isTestFile(name: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name);
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
    if (!SOURCE_EXT.has(path.extname(entry.name)) || isTestFile(entry.name))
      continue;
    files.push(full);
  }
}

const entry = process.argv[1];
const isMain =
  entry !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entry)).href;

if (isMain) {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const issues = await scan(root);
  for (const hit of issues) {
    const line = `${hit.file}:${hit.line} ${hit.rule} ${hit.excerpt}`;
    if (hit.level === 'error') console.error(`- ${line}`);
    else console.warn(`- ${line}`);
  }
  const errors = failureCount(issues);
  if (errors > 0) {
    console.error(`copy-lint: ${errors} erreur(s)`);
    process.exit(1);
  }
  const warnings = issues.length - errors;
  if (warnings > 0) console.warn(`copy-lint: ${warnings} avertissement(s)`);
}
