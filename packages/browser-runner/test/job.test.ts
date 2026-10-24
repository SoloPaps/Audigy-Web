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
import { browserResultsPath } from '../src/schema.js';
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
    expect(summary).toMatchObject({
      auditId: ID,
      artifacts: [
        browserResultsPath(ID),
        `${ID}/browser/capture-desktop.webp`,
        `${ID}/browser/manifest.json`,
      ],
      errors: 0,
    });
    expect(summary.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(
      saved.map((a) => [
        a.kind,
        a.contentType,
        a.path.endsWith('manifest.json'),
      ]),
    ).toEqual([
      ['json', 'application/json', false],
      ['screenshot', 'image/webp', false],
      ['json', 'application/json', true],
    ]);
    for (const artifact of saved)
      expect(artifact.sha256).toBe(
        createHash('sha256').update(artifact.data).digest('hex'),
      );
    expect(JSON.parse(saved[0]?.data.toString() ?? '')).toEqual(sampleResult());
  });

  it('hache le PDF et le WARC dans le manifeste', async () => {
    const warc = Buffer.from('WARC/1.1\r\n');
    const pdf = Buffer.from('%PDF-1.7\n');
    const { store, saved } = memoryStore({
      url: 'https://www.exemple.fr/',
      status: 'partial',
    });
    const renderPdf = vi.fn(async (html: string) => {
      expect(html).toContain(`https://audigy.exemple/verifier/${ID}`);
      expect(html).toContain(
        createHash('sha256')
          .update(JSON.stringify(sampleResult()))
          .digest('hex'),
      );
      expect(html).not.toContain(
        createHash('sha256').update(pdf).digest('hex'),
      );
      expect(html).toContain('2026');
      return pdf;
    });
    const summary = await runJob(ID, {
      store,
      run: async () => ({
        ...output,
        warc: { file: 'accueil.warc', data: warc },
      }),
      warc: true,
      verifyOrigin: 'https://audigy.exemple/',
      renderPdf,
    });
    expect(renderPdf).toHaveBeenCalledOnce();
    const manifest = saved.find((file) => file.path.endsWith('manifest.json'));
    const parsed = JSON.parse(manifest?.data.toString() ?? '') as {
      resultsSha256: string;
      fichiers: { fichier: string; sha256: string; octets: number }[];
    };
    expect(parsed.resultsSha256).toBe(
      createHash('sha256').update(JSON.stringify(sampleResult())).digest('hex'),
    );
    expect(parsed.fichiers).toEqual(
      expect.arrayContaining([
        {
          fichier: 'accueil.warc',
          sha256: createHash('sha256').update(warc).digest('hex'),
          octets: warc.length,
        },
        {
          fichier: 'rapport.pdf',
          sha256: createHash('sha256').update(pdf).digest('hex'),
          octets: pdf.length,
        },
        {
          fichier: 'capture-desktop.webp',
          sha256: createHash('sha256')
            .update(Buffer.from('RIFF'))
            .digest('hex'),
          octets: 4,
        },
      ]),
    );
    expect(summary.manifestSha256).toBe(
      createHash('sha256')
        .update(manifest?.data ?? '')
        .digest('hex'),
    );
    expect(summary.artifacts).toContain(`${ID}/browser/rapport.pdf`);
    expect(summary.artifacts).toContain(`${ID}/browser/accueil.warc`);
  });

  it('accepte un audit partiel : l’orchestration attend ce runner', async () => {
    const { store, saved } = memoryStore({
      url: 'https://www.exemple.fr/',
      status: 'partial',
    });
    await runJob(ID, { store, run: vi.fn(async () => output) });
    expect(saved.map((a) => a.path)).toContain(browserResultsPath(ID));
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
