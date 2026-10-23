import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type FixtureServer,
  startFixtureServer,
} from '../../../fixtures/server.js';
import { fileFixStore } from '../src/fixes-fs.js';
import { type Check, loadFixes, runAudit } from '../src/index.js';
import { FACTICE_PATH, facticeActif, facticePassif } from './factices.js';
import { fakeCheck, makeContext, result } from './helpers.js';

const fixes = await loadFixes(
  fileFixStore(fileURLToPath(new URL('./fixes/fr/', import.meta.url))),
);

const synthetic: Check[] = [
  fakeCheck('qualite.liens', result('warn', { severity: 2, impact: 1 }), {
    weight: 1,
  }),
  fakeCheck('securite.hsts_test', result('pass', { severity: 1 }), {
    weight: 2,
  }),
  fakeCheck('seo.lighthouse_test', result('warn', { score: 0.83 }), {
    weight: 3,
    needs: ['psi'],
  }),
  fakeCheck('reputation.avis_test', result('na')),
];
const checks = [facticePassif, facticeActif, ...synthetic];

let bon: FixtureServer;
let mauvais: FixtureServer;
beforeAll(async () => {
  bon = await startFixtureServer('bon');
  mauvais = await startFixtureServer('mauvais');
});
afterAll(async () => {
  await bon.close();
  await mauvais.close();
});

function audit(
  server: FixtureServer,
  verified: boolean,
  list: readonly Check[] = checks,
  concurrency = 4,
) {
  return runAudit(list, makeContext({ verified, port: server.port }), {
    fixes,
    concurrency,
  });
}

describe('runAudit sur les sites de test', () => {
  it('site non vérifié : aucune requête vers le chemin actif', async () => {
    mauvais.requests.length = 0;
    const report = await audit(mauvais, false);
    expect(mauvais.requests).toEqual(['/']);
    expect(mauvais.requests).not.toContain(FACTICE_PATH);
    const active = report.outcomes.find(
      (o) => o.checkId === 'securite.factice_actif',
    );
    expect(active?.result).toMatchObject({
      status: 'untested',
      reason: 'reason.active_unverified',
    });
  });

  it('site vérifié : le check actif tourne', async () => {
    mauvais.requests.length = 0;
    const report = await audit(mauvais, true);
    expect(mauvais.requests).toContain(FACTICE_PATH);
    expect(report.priorities[0]).toBe('securite.factice_actif');
  });

  it.each([
    ['bon', false],
    ['bon', true],
    ['mauvais', false],
    ['mauvais', true],
  ] as const)(
    'scores déterministes : %s, vérifié=%s',
    async (site, verified) => {
      const server = site === 'bon' ? bon : mauvais;
      const first = await audit(server, verified);
      const shuffled = await audit(server, verified, [...checks].reverse(), 1);
      expect(shuffled).toEqual(first);
      expect(first).toMatchSnapshot();
    },
  );
});
