import { describe, expect, it } from 'vitest';
import { reportLine } from '../../../apps/web/src/i18n/report-fr.js';
import {
  DISPONIBILITE_CHECKS,
  judgeUptime,
  scoreDomain,
  scoreGlobal,
} from '../src/index.js';
import { MAIN_DOMAINS } from '../src/types.js';

describe('disponibilite.uptime', () => {
  it('donne un pourcentage ou Non testé, hors score global', () => {
    expect(MAIN_DOMAINS).not.toContain('disponibilite');
    expect(DISPONIBILITE_CHECKS.map((item) => item.id)).toEqual([
      'disponibilite.uptime',
    ]);
    const none = judgeUptime(null);
    expect(none.status).toBe('untested');
    expect(none.messageKey).toBe('disponibilite.uptime.untested');
    expect(reportLine(none.messageKey)).toContain('sondes');

    const good = judgeUptime({ checks: 100, failures: 0 });
    expect(good.status).toBe('pass');
    expect(good.params?.pct).toBe(100);
    expect(good.score).toBe(1);

    const mid = judgeUptime({ checks: 100, failures: 3 });
    expect(mid.status).toBe('warn');
    expect(mid.params?.pct).toBe(97);

    const bad = judgeUptime({ checks: 10, failures: 2 });
    expect(bad.status).toBe('fail');
    expect(bad.params?.pct).toBe(80);

    const domain = scoreDomain('disponibilite', [
      {
        checkId: 'disponibilite.uptime',
        domain: 'disponibilite',
        mode: 'passive',
        weight: 1,
        result: good,
      },
    ]);
    expect(domain.score).toBe(100);
    const global = scoreGlobal([domain, scoreDomain('performance', [])]);
    expect(global.scoredDomains).not.toContain('disponibilite');
  });
});
