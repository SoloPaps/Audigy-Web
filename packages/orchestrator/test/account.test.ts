import { TERMS_VERSION } from '@audigy/db';
import { describe, expect, it } from 'vitest';
import {
  type AccountExport,
  type AccountGateway,
  deleteAccount,
  handleAccount,
  mergeArtifactPaths,
  OAUTH_EXPORT_FIELDS,
} from '../src/index.js';
import { captureLogger } from './helpers.js';

const TOKEN = 'jeton-utilisateur-0123456789abcdef';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function emptyExport(url = 'https://a.exemple'): AccountExport {
  return {
    exporteLe: '2026-10-24T12:00:00.000Z',
    versionCgu: TERMS_VERSION,
    profil: {
      identifiant: A,
      nom: '',
      langue: 'fr',
      courriel: 'ada@exemple.fr',
      resumeHebdo: false,
      courrielCoupe: false,
      creeLe: '2026-10-01T00:00:00.000Z',
    },
    acceptations: [],
    sites: [
      {
        identifiant: 'site-a',
        adresse: url,
        portee: 'origin',
        hote: 'a.exemple',
        prefixe: null,
        libelle: '',
        hebergeur: 'other',
        public: false,
        slug: null,
        supprimeLe: null,
      },
    ],
    verifications: [],
    audits: [],
    scores: [],
    constats: [],
    artefacts: [
      {
        audit: 'audit-a',
        type: 'screenshot',
        chemin: 'a/file.webp',
        empreinte: 'ab'.repeat(32),
        octets: 12,
      },
    ],
    rapports: [],
    planifications: [],
    disponibilite: [],
    sondes: [],
    incidents: [],
    alertes: [],
    lieux: [],
    journal: [],
    connexions: [{ fournisseur: 'google' }],
  };
}

class Memory {
  profiles = new Set([A, B]);
  storage = new Set(['a/file.webp', 'b/secret.webp']);
  rows = [
    { owner: A, path: 'a/file.webp' },
    { owner: B, path: 'b/secret.webp' },
  ];
  sites = [
    { owner: A, url: 'https://a.exemple' },
    { owner: B, url: 'https://b.exemple' },
  ];
  terms: { user: string; version: string }[] = [];
  removed: string[] = [];
  failRemove = false;
  deleted: string[] = [];

  gateway(_userId: string): AccountGateway {
    return {
      readExport: async () => emptyExport(),
      listArtifactPaths: async (id) =>
        this.rows.filter((row) => row.owner === id).map((row) => row.path),
      removeStorage: async (paths) => {
        this.removed.push(...paths);
        if (this.failRemove) return;
        for (const path of paths) this.storage.delete(path);
      },
      storageStillPresent: async (paths) =>
        paths.filter((path) => this.storage.has(path)),
      deleteUser: async (id) => {
        this.deleted.push(id);
        this.profiles.delete(id);
        this.rows = this.rows.filter((row) => row.owner !== id);
        this.sites = this.sites.filter((site) => site.owner !== id);
        this.terms = this.terms.filter((row) => row.user !== id);
      },
      profileExists: async (id) => this.profiles.has(id),
      listTerms: async (id) =>
        this.terms
          .filter((row) => row.user === id)
          .map((row) => ({
            version: row.version,
            acceptedAt: '2026-10-24T08:00:00.000Z',
          })),
      acceptTerms: async (id, version) => {
        if (version !== TERMS_VERSION) throw new Error('terms_version');
        if (
          this.terms.some((row) => row.user === id && row.version === version)
        )
          return;
        this.terms.push({ user: id, version });
      },
    };
  }
}

function deps(memory: Memory) {
  const { logger } = captureLogger([TOKEN]);
  return {
    logger,
    userFromToken: async (token: string) => (token === TOKEN ? A : null),
    gateway: (token: string, userId: string) => {
      if (token !== TOKEN || userId !== A) throw new Error('scope');
      return memory.gateway(userId);
    },
  };
}

function call(
  memory: Memory,
  path: string,
  method: string,
  body?: unknown,
  token: string | null = TOKEN,
) {
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('content-type', 'application/json');
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  return handleAccount(
    new Request(`http://localhost${path}`, init),
    deps(memory),
    path.split('/').pop(),
  );
}

describe('suppression de compte', () => {
  it('efface les données et les artefacts, et laisse l’autre compte', async () => {
    const memory = new Memory();
    await deleteAccount(memory.gateway(A), A);
    expect(memory.storage.has('a/file.webp')).toBe(false);
    expect(memory.storage.has('b/secret.webp')).toBe(true);
    expect(memory.profiles.has(A)).toBe(false);
    expect(memory.profiles.has(B)).toBe(true);
    expect(memory.sites.map((site) => site.owner)).toEqual([B]);
    expect(memory.rows.map((row) => row.owner)).toEqual([B]);
    expect(memory.removed).toEqual(['a/file.webp']);
  });

  it('ne supprime pas le compte si un artefact reste', async () => {
    const memory = new Memory();
    memory.failRemove = true;
    await expect(deleteAccount(memory.gateway(A), A)).rejects.toThrow(
      'artifacts_remain',
    );
    expect(memory.profiles.has(A)).toBe(true);
    expect(memory.storage.has('a/file.webp')).toBe(true);
    expect(memory.deleted).toEqual([]);
  });

  it('fusionne les chemins sans doublon', () => {
    expect(
      mergeArtifactPaths(['a/file.webp'], ['a/file.webp', 'a/b.json']),
    ).toEqual(['a/file.webp', 'a/b.json']);
  });
});

describe('API compte', () => {
  it('n’exporte pas le jeton OAuth', () => {
    expect(OAUTH_EXPORT_FIELDS).toEqual(['provider']);
  });

  it('renvoie le JSON du compte, sans secret', async () => {
    const memory = new Memory();
    const res = await call(memory, '/api/compte/export', 'GET');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(
      'audigy-donnees.json',
    );
    const body = (await res.json()) as AccountExport;
    expect(body.sites[0]?.adresse).toBe('https://a.exemple');
    expect(body.artefacts[0]?.chemin).toBe('a/file.webp');
    expect(JSON.stringify(body)).not.toContain('refresh_token');
    expect(body.connexions).toEqual([{ fournisseur: 'google' }]);
  });

  it('refuse l’export sans session', async () => {
    const res = await call(
      new Memory(),
      '/api/compte/export',
      'GET',
      undefined,
      null,
    );
    expect(res.status).toBe(401);
  });

  it('enregistre la version en vigueur, une seule fois', async () => {
    const memory = new Memory();
    const stale = await call(memory, '/api/compte/cgu', 'POST', {
      version: '1999.1',
    });
    expect(stale.status).toBe(409);
    expect(memory.terms).toEqual([]);
    const ok = await call(memory, '/api/compte/cgu', 'POST', {
      version: TERMS_VERSION,
    });
    expect(ok.status).toBe(200);
    const again = await call(memory, '/api/compte/cgu', 'POST', {
      version: TERMS_VERSION,
    });
    expect(again.status).toBe(200);
    expect(memory.terms).toEqual([{ user: A, version: TERMS_VERSION }]);
    const read = await call(memory, '/api/compte/cgu', 'GET');
    expect(await read.json()).toEqual({
      version: TERMS_VERSION,
      accepted: true,
      acceptedAt: '2026-10-24T08:00:00.000Z',
    });
  });

  it('exige le mot de confirmation avant d’effacer', async () => {
    const memory = new Memory();
    const refused = await call(memory, '/api/compte/suppression', 'POST', {
      confirm: 'oui',
    });
    expect(refused.status).toBe(400);
    expect(memory.profiles.has(A)).toBe(true);
    const res = await call(memory, '/api/compte/suppression', 'POST', {
      confirm: 'supprimer',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(memory.profiles.has(A)).toBe(false);
    expect(memory.storage.has('a/file.webp')).toBe(false);
    expect(memory.storage.has('b/secret.webp')).toBe(true);
  });
});
