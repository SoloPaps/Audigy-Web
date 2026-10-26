import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { lintText } from '../../../../scripts/copy-lint.js';
import { translate } from '../lib/translate.js';
import { fr, type MessageKey, t } from './index.js';
import { installPack } from './pack.js';
import { REPORT_KEYS, tReport } from './report-fr.js';

const pack = JSON.parse(
  readFileSync(
    new URL('../../public/dictionnaire-en.json', import.meta.url),
    'utf8',
  ),
) as Record<string, string>;

function holes(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('dictionnaire anglais', () => {
  afterEach(() => {
    installPack(null);
  });

  it('couvre chaque clé française et chaque texte de rapport', () => {
    for (const key of Object.keys(fr) as MessageKey[]) {
      const line = pack[key];
      expect(line, key).toBeTruthy();
      expect(holes(line ?? '')).toEqual(holes(fr[key]));
      const issues = lintText(line ?? '', key).filter(
        (issue) => issue.level === 'error',
      );
      expect(issues, key).toEqual([]);
    }
    for (const key of REPORT_KEYS) {
      const line = pack[key];
      expect(line, key).toBeTruthy();
      expect(holes(line ?? '')).toEqual(holes(tReport(key)));
    }
  });

  it('passe par t() quand le dictionnaire est posé', () => {
    expect(t('home.submit')).toBe("Lancer l'audit");
    installPack(pack);
    expect(t('home.submit')).toBe('Start the audit');
    expect(t('finding.effort', { minutes: 20 })).toBe('20 min');
    expect(tReport('rgesn.screen.empty')).toBe(
      'No answer saved. This is not a failure.',
    );
    expect(translate('disponibilite.uptime.pct', { pct: 99 })).toBe(
      '99% of the probes answered.',
    );
    installPack(null);
    expect(t('home.submit')).toBe("Lancer l'audit");
  });
});
