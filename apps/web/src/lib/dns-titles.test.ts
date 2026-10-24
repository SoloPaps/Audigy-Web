import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { domainPlain } from './domains.js';

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/engine/fixes/fr',
);

function title(id: string): string {
  const text = readFileSync(join(dir, `${id}.md`), 'utf8');
  const line = text.split('\n').find((row) => row.startsWith('title:'));
  return line?.slice('title:'.length).trim() ?? '';
}

describe('titres nom et courrier', () => {
  it('garde un seul domaine', () => {
    expect(domainPlain('dns_email')).toBe('Nom et courrier');
  });

  it('sépare le nom et le courrier dans le titre', () => {
    for (const id of ['dns_email.dnssec', 'dns_email.caa']) {
      const value = title(id);
      expect(value.startsWith('Nom de domaine')).toBe(true);
      expect(value.toLowerCase()).not.toContain('courrier');
    }
    for (const id of [
      'dns_email.mx',
      'dns_email.spf',
      'dns_email.dkim',
      'dns_email.dmarc',
      'dns_email.mta_sts',
    ]) {
      const value = title(id);
      expect(value.startsWith('Courrier')).toBe(true);
      expect(value.toLowerCase()).not.toContain('site');
    }
  });
});
