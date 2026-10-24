import type { Database } from '@audigy/db';
import type { GscSnapshot, SearchConsolePort } from '@audigy/engine';
import { matchProperty } from '@audigy/engine';
import {
  createExternalApi,
  createGoogleAuthClient,
  createSearchConsoleApi,
  GoogleApiError,
  type SearchConsoleApi,
} from '@audigy/net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readOauthConfig, supabaseOauthRows } from './oauth-google.js';
import { createOauthCrypto, type OauthCrypto } from './token-box.js';

const VERDICTS = new Set(['PASS', 'PARTIAL', 'FAIL', 'NEUTRAL']);

export function createGscPort(api: SearchConsoleApi): SearchConsolePort {
  return {
    async snapshot(pageUrl, signal) {
      let sites: Awaited<ReturnType<SearchConsoleApi['listSites']>>;
      try {
        sites = await api.listSites(signal);
      } catch (error) {
        return down(failureOf(error));
      }
      const property = matchProperty(pageUrl, sites);
      if (!property) {
        return {
          sites: 'ok',
          property: null,
          sitemaps: { ok: true, entries: [] },
          inspection: { ok: true, verdict: 'NEUTRAL' },
        };
      }
      const [sitemaps, inspection] = await Promise.all([
        readSitemaps(api, property, signal),
        readInspection(api, property, pageUrl, signal),
      ]);
      return { sites: 'ok', property, sitemaps, inspection };
    },
  };
}

export function staticGscPort(snapshot: GscSnapshot): SearchConsolePort {
  return {
    async snapshot() {
      return snapshot;
    },
  };
}

export interface GscLoader {
  ownerOf(siteId: string): Promise<string | null>;
  readBlob(userId: string): Promise<Buffer | null>;
  decrypt: OauthCrypto['decrypt'];
  refresh(
    refreshToken: string,
  ): Promise<
    { ok: true; accessToken: string } | { ok: false; failure: 'auth' | 'error' }
  >;
  api(accessToken: string): SearchConsoleApi;
}

/**
 * Port pour l’audit du site. `null` : pas de jeton (le check propose de relier).
 * Un jeton expiré ou illisible donne un port qui répond `auth`, pas le secret.
 */
/** Branche Search Console pour un audit. `null` si le compte n’est pas relié. */
export async function gscForAudit(
  service: SupabaseClient<Database>,
  env: NodeJS.ProcessEnv,
  siteId: string,
): Promise<SearchConsolePort | null> {
  const read = readOauthConfig(env);
  if (!read) return null;
  const crypto = createOauthCrypto(read.key);
  const http = createExternalApi();
  const google = createGoogleAuthClient({
    api: http,
    clientId: read.config.clientId,
    clientSecret: read.clientSecret,
  });
  const rows = supabaseOauthRows(service);
  return loadSearchConsole(
    {
      async ownerOf(id) {
        const { data, error } = await service
          .from('sites')
          .select('owner_id')
          .eq('id', id)
          .maybeSingle();
        if (error || !data) return null;
        return data.owner_id;
      },
      readBlob: (userId) => rows.read(userId),
      decrypt: (blob) => crypto.decrypt(blob),
      async refresh(refreshToken) {
        try {
          const tokens = await google.refresh(refreshToken);
          return { ok: true, accessToken: tokens.accessToken };
        } catch (error) {
          if (error instanceof GoogleApiError && error.failure === 'auth') {
            return { ok: false, failure: 'auth' };
          }
          return { ok: false, failure: 'error' };
        }
      },
      api: (accessToken) => createSearchConsoleApi({ api: http, accessToken }),
    },
    siteId,
  );
}

export async function loadSearchConsole(
  loader: GscLoader,
  siteId: string,
): Promise<SearchConsolePort | null> {
  const ownerId = await loader.ownerOf(siteId);
  if (!ownerId) return null;
  const blob = await loader.readBlob(ownerId);
  if (!blob) return null;
  let refreshToken: string;
  try {
    refreshToken = loader.decrypt(blob);
  } catch {
    return staticGscPort(down('auth'));
  }
  const refreshed = await loader.refresh(refreshToken);
  if (!refreshed.ok) return staticGscPort(down(refreshed.failure));
  return createGscPort(loader.api(refreshed.accessToken));
}

function down(failure: 'quota' | 'auth' | 'error'): GscSnapshot {
  return {
    sites: failure,
    property: null,
    sitemaps: { ok: false, failure },
    inspection: { ok: false, failure },
  };
}

async function readSitemaps(
  api: SearchConsoleApi,
  property: string,
  signal: AbortSignal,
): Promise<GscSnapshot['sitemaps']> {
  try {
    const rows = await api.listSitemaps(property, signal);
    return {
      ok: true,
      entries: rows.map((row) => ({
        path: row.path,
        errors: row.errors,
        warnings: row.warnings,
        pending: row.pending,
        isIndex: row.isIndex,
        submitted: row.submitted,
        indexed: row.indexed,
      })),
    };
  } catch (error) {
    return { ok: false, failure: failureOf(error) };
  }
}

async function readInspection(
  api: SearchConsoleApi,
  property: string,
  pageUrl: string,
  signal: AbortSignal,
): Promise<GscSnapshot['inspection']> {
  try {
    const inspected = await api.inspect(property, pageUrl, signal);
    if (!VERDICTS.has(inspected.verdict))
      return { ok: false, failure: 'error' };
    return {
      ok: true,
      verdict: inspected.verdict as 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL',
    };
  } catch (error) {
    return { ok: false, failure: failureOf(error) };
  }
}

function failureOf(error: unknown): 'quota' | 'auth' | 'error' {
  if (error instanceof GoogleApiError) return error.failure;
  return 'error';
}
