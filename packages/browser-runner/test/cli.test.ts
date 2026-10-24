import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NetError } from '@audigy/net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type CliIo, main, summaryLines } from '../src/cli.js';
import type { BrowserAuditOutput } from '../src/run.js';
import { sampleResult } from './sample.js';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true });
});

async function io(env: NodeJS.ProcessEnv = {}) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'audigy-cli-'));
  dirs.push(cwd);
  const out: string[] = [];
  const err: string[] = [];
  const value: CliIo = {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    env,
    cwd,
  };
  return { value, out, err, cwd };
}

const output: BrowserAuditOutput = {
  result: sampleResult(),
  screenshots: [
    { file: 'capture-desktop.webp', data: Buffer.from('RIFF0000WEBP') },
  ],
};

describe('CLI locale', () => {
  it('affiche l’aide et refuse une commande incomplète', async () => {
    const help = await io();
    expect(await main(['--help'], help.value)).toBe(0);
    expect(help.out.join('\n')).toContain('audigy-browser audit <url>');
    const bad = await io();
    expect(await main(['audit'], bad.value)).toBe(2);
    expect(await main(['inconnu', 'x'], bad.value)).toBe(2);
    expect(await main(['audit', 'x', '--option-inconnue'], bad.value)).toBe(2);
  });

  it('écrit browser.json et les captures, puis un résumé', async () => {
    const t = await io({ APP_BASE_URL: 'https://audigy.exemple' });
    const run = vi.fn(async () => output);
    expect(
      await main(
        ['audit', 'https://www.exemple.fr/', '--out', 'res'],
        t.value,
        {
          run,
        },
      ),
    ).toBe(0);
    expect(run).toHaveBeenCalledWith({
      url: 'https://www.exemple.fr/',
      botUrl: 'https://audigy.exemple',
    });
    const json = JSON.parse(
      await readFile(path.join(t.cwd, 'res', 'browser.json'), 'utf8'),
    );
    expect(json).toEqual(sampleResult());
    expect(
      (await readFile(path.join(t.cwd, 'res', 'capture-desktop.webp'))).length,
    ).toBe(12);
    expect(t.out.at(-1)).toBe(`Résultat : ${path.join('res', 'browser.json')}`);
  });

  it('range par défaut sous .audigy-browser/<hôte>, ou sort le JSON', async () => {
    const t = await io();
    const run = vi.fn(async () => output);
    await main(
      ['audit', 'https://www.exemple.fr/', '--desktop-only'],
      t.value,
      {
        run,
      },
    );
    expect(run).toHaveBeenCalledWith({
      url: 'https://www.exemple.fr/',
      viewports: ['desktop'],
    });
    await readFile(
      path.join(t.cwd, '.audigy-browser', 'www.exemple.fr', 'browser.json'),
    );
    const j = await io();
    await main(['audit', 'https://www.exemple.fr/', '--json'], j.value, {
      run,
    });
    expect(JSON.parse(j.out.join('\n'))).toEqual(sampleResult());
  });

  it('explique un refus anti-SSRF', async () => {
    const t = await io();
    const run = vi.fn(async () => {
      throw new NetError('BLOCKED_ADDRESS', 'Adresse refusée (loopback)');
    });
    expect(await main(['audit', 'http://127.0.0.1/'], t.value, { run })).toBe(
      1,
    );
    expect(t.err).toEqual(['Adresse refusée : BLOCKED_ADDRESS']);
  });

  it('échoue si la page n’a pas pu être chargée', async () => {
    const t = await io();
    const failed = sampleResult();
    failed.loads.desktop.error = 'BLOCKED_ADDRESS';
    const run = vi.fn(async () => ({ result: failed, screenshots: [] }));
    expect(
      await main(['audit', 'https://interne.exemple/'], t.value, { run }),
    ).toBe(1);
  });

  it('job sans variables Supabase : échec clair, aucun secret affiché', async () => {
    const t = await io();
    expect(
      await main(['job', '7f1d5f8e-2c4b-4a7e-9a51-3d2c1b0a9f88'], t.value, {
        run: vi.fn(),
      }),
    ).toBe(1);
    expect(t.err[0]).toMatch(/SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('résume sans valeur de trace', () => {
    const lines = summaryLines(sampleResult()).join('\n');
    expect(lines).toContain('Traces avant consentement : 1 (dont 0 tierces)');
    expect(lines).toContain('Bandeau de consentement : aucun reconnu');
  });
});
