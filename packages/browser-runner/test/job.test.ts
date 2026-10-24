import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  type JobArtifact,
  type JobStore,
  jobStoreFromEnv,
  runJob,
  supabaseJobStore,
} from '../src/job.js';
import type { BrowserAuditOutput } from '../src/run.js';
import { sampleResult } from './sample.js';

const ID = '7f1d5f8e-2c4b-4a7e-9a51-3d2c1b0a9f88';

function memoryStore(audit: { url: string; status: string } | null) {
  const saved: JobArtifact[] = [];
  const store: JobStore = {
    loadAudit: vi.fn(async () => audit),
    saveArtifact: async (artifact) => {
      saved.push(artifact);
    },
  };
  return { store, saved };
}

const output: BrowserAuditOutput = {
  result: sampleResult(),
  screenshots: [{ file: 'capture-desktop.webp', data: Buffer.from('RIFF') }],
};

describe('exécution par identifiant d’audit', () => {
  it('lance le runner sur l’URL du site et range les artefacts', async () => {
    const { store, saved } = memoryStore({
      url: 'https://www.exemple.fr/',
      status: 'running',
    });
    const run = vi.fn(async () => output);
    const summary = await runJob(ID, {
      store,
      run,
      botUrl: 'https://audigy.exemple',
    });
    expect(run).toHaveBeenCalledWith({
      url: 'https://www.exemple.fr/',
      botUrl: 'https://audigy.exemple',
    });
    expect(summary).toEqual({
      auditId: ID,
      artifacts: [
        `${ID}/browser/results.json`,
        `${ID}/browser/capture-desktop.webp`,
      ],
      errors: 0,
    });
    expect(saved.map((a) => [a.kind, a.contentType])).toEqual([
      ['json', 'application/json'],
      ['screenshot', 'image/webp'],
    ]);
    for (const artifact of saved)
      expect(artifact.sha256).toBe(
        createHash('sha256').update(artifact.data).digest('hex'),
      );
    expect(JSON.parse(saved[0]?.data.toString() ?? '')).toEqual(sampleResult());
  });

  it('refuse un identifiant invalide sans rien lire', async () => {
    const { store } = memoryStore(null);
    await expect(
      runJob('1; drop table audits', { store, run: vi.fn() }),
    ).rejects.toMatchObject({ code: 'INVALID_AUDIT_ID' });
    expect(store.loadAudit).not.toHaveBeenCalled();
  });

  it('refuse un audit introuvable ou déjà clos', async () => {
    const run = vi.fn();
    await expect(
      runJob(ID, { store: memoryStore(null).store, run }),
    ).rejects.toMatchObject({ code: 'AUDIT_NOT_FOUND' });
    await expect(
      runJob(ID, {
        store: memoryStore({ url: 'https://x.fr/', status: 'done' }).store,
        run,
      }),
    ).rejects.toMatchObject({ code: 'AUDIT_CLOSED' });
    expect(run).not.toHaveBeenCalled();
  });

  it('exige les variables Supabase, sans valeur par défaut', () => {
    expect(() => jobStoreFromEnv({})).toThrow(/SUPABASE_URL/);
  });
});

describe('supabaseJobStore', () => {
  function fakeClient(row: unknown) {
    const calls: string[] = [];
    type Done = Promise<{ error: null }> & { eq: () => Done };
    const done: Done = Object.assign(Promise.resolve({ error: null as null }), {
      eq: () => done,
    });
    const query = {
      select: () => query,
      eq: () => query,
      delete: () => {
        calls.push('delete');
        return done;
      },
      maybeSingle: async () => ({ data: row, error: null }),
      insert: async (values: unknown) => {
        calls.push(`insert ${JSON.stringify(values)}`);
        return { error: null };
      },
    };
    const client = {
      from: (table: string) => {
        calls.push(`from ${table}`);
        return query;
      },
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string) => {
            calls.push(`upload ${bucket}/${path}`);
            return { error: null };
          },
        }),
      },
    };
    return {
      store: supabaseJobStore(
        client as unknown as Parameters<typeof supabaseJobStore>[0],
      ),
      calls,
    };
  }

  it('lit l’URL du site, ignore un site supprimé', async () => {
    const live = fakeClient({
      status: 'queued',
      sites: { url: 'https://www.exemple.fr/', deleted_at: null },
    });
    expect(await live.store.loadAudit(ID)).toEqual({
      url: 'https://www.exemple.fr/',
      status: 'queued',
    });
    const deleted = fakeClient({
      status: 'queued',
      sites: { url: 'https://www.exemple.fr/', deleted_at: '2026-10-01' },
    });
    expect(await deleted.store.loadAudit(ID)).toBeNull();
  });

  it('envoie dans le seau privé puis enregistre empreinte et taille', async () => {
    const { store, calls } = fakeClient(null);
    await store.saveArtifact({
      auditId: ID,
      kind: 'json',
      path: `${ID}/browser/results.json`,
      data: Buffer.from('{}'),
      contentType: 'application/json',
      sha256: 'b'.repeat(64),
    });
    expect(calls).toEqual([
      `upload artifacts/${ID}/browser/results.json`,
      'from artifacts',
      'delete',
      'from artifacts',
      `insert ${JSON.stringify({
        audit_id: ID,
        kind: 'json',
        storage_path: `${ID}/browser/results.json`,
        sha256: 'b'.repeat(64),
        bytes: 2,
      })}`,
    ]);
  });
});
