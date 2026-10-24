import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('revue de sécurité', () => {
  it('active la RLS sur chaque table publique', async () => {
    const dir = 'supabase/migrations';
    const names = (await readdir(dir)).filter((name) => name.endsWith('.sql'));
    const sql = (
      await Promise.all(
        names.map((name) => readFile(path.join(dir, name), 'utf8')),
      )
    ).join('\n');
    const tables = [...sql.matchAll(/create table public\.([a-z_]+)/gi)].map(
      (match) => match[1] ?? '',
    );
    expect(tables.length).toBeGreaterThan(10);
    for (const table of tables) {
      expect(sql.toLowerCase()).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
    for (const sealed of ['rate_limits', 'oauth_tokens']) {
      expect(sql).not.toMatch(
        new RegExp(`create policy \\w+ on public\\.${sealed}\\b`, 'i'),
      );
    }
  });

  it('aligne security.txt sur le courriel légal', async () => {
    const fr = await readFile('apps/web/src/i18n/fr.ts', 'utf8');
    const email = /'legal\.email': '([^']+)'/u.exec(fr)?.[1];
    const txt = await readFile(
      'apps/web/public/.well-known/security.txt',
      'utf8',
    );
    expect(email).toBeTruthy();
    expect(txt).toContain(`Contact: mailto:${email}`);
    expect(txt).toContain('Expires: 2027-12-31T23:00:00.000Z');
    expect(txt).not.toContain('Canonical:');
  });
});
