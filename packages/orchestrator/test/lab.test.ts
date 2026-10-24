import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequestBudget } from '@audigy/net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Lab, startLab } from '../../../fixtures/lab.js';
import { LAB_ENV_NAME, labFromEnv, labNet } from '../src/index.js';

let lab: Lab;
let dir: string;
let file: string;

beforeAll(async () => {
  lab = await startLab();
  dir = await mkdtemp(path.join(tmpdir(), 'audigy-lab-'));
  file = path.join(dir, 'lab.json');
  await writeFile(file, JSON.stringify(lab.config));
});

afterAll(async () => {
  await lab?.close();
  await rm(dir, { recursive: true, force: true });
});

describe('labo local', () => {
  it('fonctions : actif seulement sous netlify dev', () => {
    const env = { [LAB_ENV_NAME]: file };
    expect(labFromEnv(env, { requireNetlifyDev: true })).toBeNull();
    expect(labFromEnv({}, { requireNetlifyDev: false })).toBeNull();
    expect(
      labFromEnv({ ...env, NETLIFY_DEV: 'true' }, { requireNetlifyDev: true })
        ?.hosts,
    ).toHaveProperty(['bon.audigy.test']);
  });

  it('refuse un fichier hors schéma', async () => {
    const bad = path.join(dir, 'bad.json');
    await writeFile(
      bad,
      JSON.stringify({
        ...lab.config,
        hosts: { 'exemple.fr': { http: 1, https: 2 } },
      }),
    );
    expect(() =>
      labFromEnv({ [LAB_ENV_NAME]: bad }, { requireNetlifyDev: false }),
    ).toThrow();
  });

  it('sert les noms du labo en HTTPS, refuse tout le reste', async () => {
    const net = labNet(
      lab.config,
      createRequestBudget({ perHostIntervalMs: 0 }),
    );
    const res = await net.fetch('https://bon.audigy.test/');
    expect(res.status).toBe(200);
    await expect(net.fetch('https://exemple.fr/')).rejects.toThrow();
    await expect(net.dns.addresses('bon.audigy.test')).rejects.toThrow();
    await expect(
      net.api?.request({ url: 'https://www.googleapis.com/' } as never),
    ).rejects.toThrow();
  });
});
