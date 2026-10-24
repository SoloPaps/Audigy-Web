import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  BROWSER_SHARED_KEY,
  type Check,
  SECURITE_CHECKS,
} from '@audigy/engine';
import { t } from '@audigy/web/i18n';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { type Lab, startLab } from '../../../fixtures/lab.js';
import { type CliDeps, runCli } from '../src/index.js';

const browserCheck: Check = {
  id: 'accessibilite.fictif',
  domain: 'accessibilite',
  mode: 'passive',
  needs: ['http', 'browser'],
  weight: 2,
  run: async (ctx) => {
    const data = await ctx.shared.get<{ ok?: boolean }>(
      BROWSER_SHARED_KEY,
      async () => ({}),
    );
    return {
      status: data.ok ? 'pass' : 'fail',
      severity: 2,
      impact: 2,
      messageKey: 'accessibilite.fictif',
    };
  },
};

let lab: Lab;
let dir: string;
let env: NodeJS.ProcessEnv;

beforeAll(async () => {
  lab = await startLab();
  dir = await mkdtemp(path.join(tmpdir(), 'audigy-cli-'));
  const file = path.join(dir, 'lab.json');
  await writeFile(file, JSON.stringify(lab.config));
  env = { AUDIGY_LAB: file };
});

afterAll(async () => {
  await lab?.close();
  await rm(dir, { recursive: true, force: true });
});

async function cli(
  argv: string[],
  deps: CliDeps = {},
  environment: NodeJS.ProcessEnv = env,
) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(
    argv,
    {
      stdout: (l) => out.push(l),
      stderr: (l) => err.push(l),
      env: environment,
    },
    {
      checks: [...SECURITE_CHECKS, browserCheck],
      perHostIntervalMs: 0,
      ...deps,
    },
  );
  return { code, out, err };
}

describe('audigy audit', () => {
  it('rapport texte en français sur le labo', async () => {
    const { code, out, err } = await cli(['audit', lab.url('bon')]);
    expect(err).toEqual([]);
    expect(code).toBe(0);
    expect(out[0]).toBe(t('cli.title', { url: 'https://bon.audigy.test/' }));
    expect(out).toContain(t('cli.domains'));
    expect(out.some((l) => l.startsWith('- Sécurité : '))).toBe(true);
    expect(out).toContain(t('cli.browser.skipped'));
    expect(out.join('\n')).toContain(
      `accessibilite.fictif : ${t('reason.browser_skipped')}`,
    );
  });

  it('--json : scores, versions, raison explicite', async () => {
    const { code, out } = await cli(['audit', 'mauvais.audigy.test', '--json']);
    expect(code).toBe(0);
    const report = JSON.parse(out.join('\n'));
    expect(report.url).toBe('https://mauvais.audigy.test/');
    expect(report.browser).toBe('skipped');
    expect(report.methodVersion).toMatch(/^\d{4}\.\d+$/);
    expect(
      report.domains.find((d: { domain: string }) => d.domain === 'securite')
        .score,
    ).toBeTypeOf('number');
    const browser = report.findings.find(
      (f: { checkId: string }) => f.checkId === 'accessibilite.fictif',
    );
    expect(browser.result).toMatchObject({
      status: 'untested',
      reason: 'reason.browser_skipped',
    });
  });

  it('le site mauvais score moins que le bon', async () => {
    const score = async (site: 'bon' | 'mauvais') =>
      JSON.parse(
        (await cli(['audit', lab.url(site), '--json'])).out.join('\n'),
      ).domains.find((d: { domain: string }) => d.domain === 'securite').score;
    expect(await score('mauvais')).toBeLessThan(await score('bon'));
  });

  it('--browser sans runner : non testé (runner absent)', async () => {
    const { code, out } = await cli(['audit', lab.url('bon'), '--browser'], {
      loadBrowserRunner: async () => null,
    });
    expect(code).toBe(0);
    expect(out).toContain(t('cli.browser.absent'));
    expect(out.join('\n')).toContain(
      `accessibilite.fictif : ${t('reason.runner_absent')}`,
    );
  });

  it('--browser avec runner : sortie fusionnée', async () => {
    const runner = vi.fn(async () => ({ ok: true }));
    const { out } = await cli(
      ['audit', lab.url('bon'), '--browser', '--json'],
      {
        loadBrowserRunner: async () => runner,
      },
    );
    expect(runner).toHaveBeenCalledWith({ url: 'https://bon.audigy.test/' });
    const report = JSON.parse(out.join('\n'));
    expect(report.browser).toBe('merged');
    expect(
      report.findings.find(
        (f: { checkId: string }) => f.checkId === 'accessibilite.fictif',
      ).result.status,
    ).toBe('pass');
  });

  it('runner en erreur : runner absent', async () => {
    const { out } = await cli(
      ['audit', lab.url('bon'), '--browser', '--json'],
      {
        loadBrowserRunner: async () => async () => {
          throw new Error('chromium absent');
        },
      },
    );
    expect(JSON.parse(out.join('\n')).browser).toBe('absent');
  });

  it('labo : un nom hors labo ne sort pas sur le réseau', async () => {
    const { code, out } = await cli(['audit', 'exemple.fr', '--json']);
    expect(code).toBe(0);
    const report = JSON.parse(out.join('\n'));
    const tested = report.findings.filter(
      (f: { result: { status: string } }) =>
        f.result.status === 'pass' || f.result.status === 'fail',
    );
    expect(tested).toEqual([]);
  });

  it('usage, commande inconnue, adresse invalide', async () => {
    expect((await cli(['--help'])).out).toEqual([t('cli.usage')]);
    expect(await cli([])).toMatchObject({ code: 2, err: [t('cli.usage')] });
    expect(await cli(['scan', 'a.fr'])).toMatchObject({
      code: 2,
      err: [t('cli.error.command'), t('cli.usage')],
    });
    expect(await cli(['audit', 'http://127.0.0.1'])).toMatchObject({
      code: 2,
      err: [t('cli.error.url')],
    });
    expect(await cli(['audit', 'a.fr', '--force'])).toMatchObject({ code: 2 });
    expect(await cli(['audit', lab.url('bon')], {}, {})).toMatchObject({
      code: 2,
      err: [t('cli.error.url')],
    });
  });
});
