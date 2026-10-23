import type { Check } from '../../src/types.js';
import { SCHEMA_TYPES } from './schema-types.js';
import { finding, loadPage, pageNotHtml, pageStatus } from './shared.js';

const ID = 'seo.jsonld';

export function judgeJsonLd(blocks: readonly string[]) {
  if (blocks.length === 0) {
    return finding(ID, 'warn', 2, 2, 'seo.jsonld.warn_missing');
  }
  const types: string[] = [];
  for (const block of blocks) {
    const text = block.trim();
    if (text === '') {
      return finding(ID, 'fail', 2, 2, 'seo.jsonld.fail_parse');
    }
    let data: unknown;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      return finding(ID, 'fail', 2, 2, 'seo.jsonld.fail_parse');
    }
    if (!collect(data, types, 0)) {
      return finding(ID, 'fail', 2, 2, 'seo.jsonld.fail_parse');
    }
  }
  if (types.length === 0) {
    return finding(ID, 'fail', 2, 2, 'seo.jsonld.fail_type');
  }
  const unknown = types.find((type) => !SCHEMA_TYPES.has(type));
  if (unknown) {
    return finding(ID, 'warn', 1, 1, 'seo.jsonld.warn_type', {
      params: { type: unknown },
      measured: { types },
    });
  }
  return finding(ID, 'pass', 1, 1, 'seo.jsonld.pass', {
    params: { type: types[0] as string },
    measured: { types },
  });
}

export const jsonldCheck: Check = {
  id: ID,
  domain: 'seo',
  mode: 'passive',
  needs: ['http'],
  weight: 1,
  async run(ctx) {
    const page = await loadPage(ctx);
    if (page.kind === 'status') return pageStatus(ID, page.res);
    if (page.kind === 'other') return pageNotHtml(ID);
    return judgeJsonLd(page.facts.jsonld);
  },
};

function collect(value: unknown, types: string[], depth: number): boolean {
  if (depth > 12) return false;
  if (Array.isArray(value)) {
    return value.every((item) => collect(item, types, depth + 1));
  }
  if (typeof value !== 'object' || value === null) return true;
  const record = value as Record<string, unknown>;
  const raw = record['@type'];
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  for (const item of list) {
    if (typeof item !== 'string') return false;
    const name = normalizeType(item);
    if (name === null) return false;
    types.push(name);
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === '@type' || key === '@context') continue;
    if (child && typeof child === 'object') {
      if (!collect(child, types, depth + 1)) return false;
    }
  }
  return true;
}

function normalizeType(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, '');
  const match = /^(?:https?:\/\/schema\.org\/)?([A-Za-z][A-Za-z0-9]*)$/.exec(
    trimmed,
  );
  return match?.[1] ?? null;
}
