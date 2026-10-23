import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { failureCount, lintSource, lintText, scan } from './copy-lint.js';

async function withFixture(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'audigy-copy-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `mot${index + 1}`).join(
    ' ',
  );
}

describe('copy-lint', () => {
  it('accepte une phrase courte et un sigle', () => {
    expect(
      lintText('Vérifiez la santé de votre site, gratuitement.', 'a.ts'),
    ).toEqual([]);
    expect(
      lintText('Le protocole HTTPS protège vos visiteurs.', 'a.ts'),
    ).toEqual([]);
    expect(lintText('© 2026', 'a.ts')).toEqual([]);
  });

  it('signale un emoji', () => {
    const issues = lintText('Bonjour 😀', 'a.ts');
    expect(issues.map((issue) => issue.rule)).toEqual(['emoji']);
    expect(issues[0]?.level).toBe('error');
    expect(
      lintText('Attention ⚠', 'a.ts').some((issue) => issue.rule === 'emoji'),
    ).toBe(true);
    expect(failureCount(issues)).toBe(1);
  });

  it('signale les capitales et ignore le commentaire', () => {
    expect(
      lintText('Ceci est CRITIQUE pour vous.', 'a.ts').map(
        (issue) => issue.rule,
      ),
    ).toEqual(['caps']);
    const source = lintSource(
      '// 😀 CRITIQUE boostez\nconst label = "Bonjour.";\n',
      'a.ts',
    );
    expect(source).toEqual([]);
  });

  it('signale les mots interdits', () => {
    for (const word of [
      'boostez',
      'Boostez',
      'propulsez',
      'sublimez',
      'révolutionnaire',
      'RÉVOLUTIONNAIRE',
    ]) {
      const issues = lintText(`Il faut ${word} le site.`, 'a.ts');
      expect(issues.some((issue) => issue.rule === 'forbidden')).toBe(true);
    }
    expect(
      lintText('En un clic magique, tout change.', 'a.ts').some(
        (issue) => issue.rule === 'forbidden',
      ),
    ).toBe(true);
  });

  it('avertit au-delà de 20 mots sans échouer', () => {
    expect(lintText(`${words(20)}.`, 'a.ts')).toEqual([]);
    const issues = lintText(`${words(21)}.`, 'a.ts');
    expect(issues).toEqual([
      expect.objectContaining({
        rule: 'sentence-length',
        level: 'warning',
        excerpt: '21 mots',
      }),
    ]);
    expect(failureCount(issues)).toBe(0);
  });

  it('ne coupe pas une date abrégée', () => {
    const sentence = `Le rapport du 23 oct. 2026 compte ${words(16)}.`;
    const issues = lintText(sentence, 'a.ts');
    expect(issues.some((issue) => issue.rule === 'sentence-length')).toBe(true);
  });

  it('lit les chaînes, les échappements et le texte HTML', () => {
    expect(
      lintSource('const a = "\\u{1F600}";', 'a.ts').some(
        (issue) => issue.rule === 'emoji',
      ),
    ).toBe(true);
    expect(
      lintSource('<p>boostez</p><!-- révolutionnaire -->', 'page.html'),
    ).toEqual([expect.objectContaining({ rule: 'forbidden', level: 'error' })]);
  });

  it('ignore la logique Svelte', () => {
    const source = [
      '{#each columns as column (column.key)}',
      '  <th scope="col">{column.label}</th>',
      '{/each}',
      '{#each rows as row, index (index)}',
      '  {#each row as cell (cell.id)}',
      '    <td>{cell.text}</td>',
      '  {/each}',
      '{/each}',
      '',
    ].join('\n');
    expect(lintSource(source, 'Table.svelte')).toEqual([]);
  });

  it('ignore la documentation et accepte une copie courte', async () => {
    await withFixture(async (dir) => {
      await mkdir(path.join(dir, 'docs'), { recursive: true });
      await writeFile(
        path.join(dir, 'docs', 'NOTES.md'),
        'boostez révolutionnaire 😀 CRITIQUE',
      );
      const src = path.join(dir, 'apps', 'web', 'src');
      await mkdir(src, { recursive: true });
      await writeFile(path.join(src, 'page.html'), '<p>Bonjour.</p>\n');
      expect(await scan(dir)).toEqual([]);
    });
  });

  it('accepte ce dépôt', async () => {
    const issues = await scan(process.cwd());
    expect(issues.filter((issue) => issue.level === 'error')).toEqual([]);
  });
});
