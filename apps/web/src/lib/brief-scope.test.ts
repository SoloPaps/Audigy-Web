import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('périmètre du brief', () => {
  it('n’entre pas dans le score public ni le partage', () => {
    const score = source('apps/web/src/components/PublicScore.svelte');
    expect(score).not.toContain('FindingList');
    expect(score).not.toContain('Générer le brief');
    expect(score).not.toContain('methode-load');
    const page = source('apps/web/src/pages/score/index.astro');
    expect(page).not.toContain('FindingList');
    const share = source('apps/web/src/pages/partage/index.astro');
    expect(share).not.toContain('FindingList');
  });

  it('ne lance pas le brief depuis une page de domaine', () => {
    const view = source('apps/web/src/components/ReportView.svelte');
    expect(view).toContain("mode === 'report'");
    expect(view).toContain('reportRows');
  });

  it('ne livre plus le prompt simple par constat', () => {
    const list = source('apps/web/src/components/FindingList.svelte');
    const copy = source('apps/web/src/i18n/fr.ts');
    expect(list).not.toContain('Copier le prompt');
    expect(copy).not.toContain('prompt.copy');
    expect(list).not.toContain('correctionPrompt');
  });
});
