import { isNetError, type SafeResponse } from '@audigy/net';
import { scopedUrl, siteFromTarget } from '../../src/ownership.js';
import type { Check, CheckContext } from '../../src/types.js';
import { finding, loadHome } from './shared.js';
import {
  decodeBody,
  EXPOSED_FILES,
  isDirectoryListing,
  LISTING_DIRS,
  matchesExposed,
  sameBody,
  TLS_VERSIONS,
} from './signatures.js';

const FILES_ID = 'securite.fichiers';
const LISTING_ID = 'securite.listing';
const TLS_ID = 'securite.tls';

type Pull =
  | { kind: 'response'; res: SafeResponse }
  | { kind: 'missing' }
  | { kind: 'error' };

async function pull(ctx: CheckContext, url: URL): Promise<Pull> {
  try {
    const res = await ctx.net.fetch(url, { signal: ctx.signal });
    if (
      res.status === 404 ||
      res.status === 410 ||
      res.status === 401 ||
      res.status === 403
    ) {
      return { kind: 'missing' };
    }
    return { kind: 'response', res };
  } catch (error) {
    if (isNetError(error)) return { kind: 'error' };
    throw error;
  }
}

/** Fichiers sensibles. Un 200 qui renvoie la page d’accueil n’est pas une preuve. */
export const exposedFilesCheck: Check = {
  id: FILES_ID,
  domain: 'securite',
  mode: 'active',
  needs: ['http'],
  weight: 3,
  timeoutMs: 90_000,
  async run(ctx) {
    const home = await loadHome(ctx);
    const site = siteFromTarget(ctx.target);
    const found: string[] = [];
    let errors = 0;
    for (const item of EXPOSED_FILES) {
      const url = scopedUrl(site, item.path);
      const got = await pull(ctx, url);
      if (got.kind === 'missing') continue;
      if (got.kind === 'error') {
        errors += 1;
        continue;
      }
      if (got.res.status !== 200) {
        errors += 1;
        continue;
      }
      if (sameBody(got.res.body, home.body)) continue;
      if (!matchesExposed(item.kind, got.res.body)) continue;
      found.push(url.pathname);
    }
    const measured = { paths: found, probed: EXPOSED_FILES.length };
    if (found.length === 1) {
      return finding(FILES_ID, 'fail', 4, 3, 'securite.fichiers.fail', {
        measured,
      });
    }
    if (found.length > 1) {
      return finding(FILES_ID, 'fail', 4, 3, 'securite.fichiers.fail_many', {
        measured,
        params: { count: found.length },
      });
    }
    if (errors > 0) {
      return finding(FILES_ID, 'untested', 1, 1, 'securite.fichiers.untested', {
        measured,
      });
    }
    return finding(FILES_ID, 'pass', 1, 1, 'securite.fichiers.pass', {
      measured,
    });
  },
};

/** Liste automatique de dossier, sous la portée seulement. */
export const directoryListingCheck: Check = {
  id: LISTING_ID,
  domain: 'securite',
  mode: 'active',
  needs: ['http'],
  weight: 2,
  timeoutMs: 90_000,
  async run(ctx) {
    const home = await loadHome(ctx);
    const site = siteFromTarget(ctx.target);
    const homeText = home.text();
    const found: string[] = [];
    let errors = 0;
    if (isDirectoryListing(homeText)) found.push(new URL(home.url).pathname);
    for (const dir of LISTING_DIRS) {
      const url = scopedUrl(site, dir);
      if (found.includes(url.pathname)) continue;
      const got = await pull(ctx, url);
      if (got.kind === 'missing') continue;
      if (got.kind === 'error') {
        errors += 1;
        continue;
      }
      if (got.res.status !== 200) {
        errors += 1;
        continue;
      }
      if (sameBody(got.res.body, home.body)) continue;
      if (!isDirectoryListing(decodeBody(got.res.body))) continue;
      found.push(url.pathname);
    }
    const measured = { paths: found, probed: LISTING_DIRS.length };
    if (found.length > 0) {
      return finding(LISTING_ID, 'fail', 3, 2, 'securite.listing.fail', {
        measured,
      });
    }
    if (errors > 0) {
      return finding(
        LISTING_ID,
        'untested',
        1,
        1,
        'securite.listing.untested',
        { measured },
      );
    }
    return finding(LISTING_ID, 'pass', 1, 1, 'securite.listing.pass', {
      measured,
    });
  },
};

/** Versions de chiffrement acceptées. TLS 1.0 et 1.1 sont un problème. */
export const tlsVersionsCheck: Check = {
  id: TLS_ID,
  domain: 'securite',
  mode: 'active',
  needs: ['tls'],
  weight: 2,
  timeoutMs: 50_000,
  async run(ctx) {
    const host = ctx.target.url.hostname;
    const accepted: string[] = [];
    let errors = 0;
    for (const version of TLS_VERSIONS) {
      try {
        const result = await ctx.net.tls(host, {
          minVersion: version.id,
          maxVersion: version.id,
        });
        if (result.protocol) accepted.push(version.label);
      } catch (error) {
        if (
          isNetError(error, 'TLS_HANDSHAKE_FAILED') ||
          isNetError(error, 'TIMEOUT')
        ) {
          continue;
        }
        if (isNetError(error)) {
          errors += 1;
          continue;
        }
        throw error;
      }
    }
    const measured = { accepted };
    const legacy = accepted.some((item) => item === '1.0' || item === '1.1');
    const modern = accepted.some((item) => item === '1.2' || item === '1.3');
    if (legacy) {
      return finding(TLS_ID, 'fail', 3, 3, 'securite.tls.fail', { measured });
    }
    if (modern && !accepted.includes('1.3')) {
      return finding(TLS_ID, 'warn', 2, 2, 'securite.tls.warn', { measured });
    }
    if (modern) {
      return finding(TLS_ID, 'pass', 1, 1, 'securite.tls.pass', { measured });
    }
    return finding(TLS_ID, 'untested', 1, 1, 'securite.tls.untested', {
      measured: { ...measured, errors },
    });
  },
};

export const ACTIVE_SECURITE_CHECKS: readonly Check[] = [
  exposedFilesCheck,
  directoryListingCheck,
  tlsVersionsCheck,
];
