import { isIP } from 'node:net';
import type { Hosting, Target } from '@audigy/engine';
import { isNetError, validateTargetUrl } from '@audigy/net';
import { z } from 'zod';

/** Suffixe des sites du labo local (`.test` est réservé, RFC 6761). */
export const LAB_SUFFIX = '.audigy.test';

const RESERVED_TLDS = ['test', 'localhost', 'invalid', 'example', 'local'];
const HOST_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;
const MAX_URL_LENGTH = 2048;

/** Un site tel qu'il est enregistré (`sites`, PLAN §8). */
export interface SiteInput {
  url: string;
  scope: 'origin' | 'path';
  host: string;
  pathPrefix: string | null;
  hosting: Hosting;
  label: string;
}

export class InvalidSiteUrl extends Error {
  override readonly name = 'InvalidSiteUrl';
}

function hostingFor(host: string): Hosting {
  if (host.endsWith('.github.io')) return 'github_pages';
  if (host.endsWith('.netlify.app')) return 'netlify';
  return 'other';
}

function prefixOf(pathname: string): string {
  const segments = pathname.split('/').filter((s) => s !== '');
  const last = segments.at(-1);
  if (last?.includes('.') && !pathname.endsWith('/')) segments.pop();
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

/**
 * Normalise une adresse saisie. Sans schéma ou en `http:`, le site est noté en `https:`
 * (le test HTTPS vérifie la version non chiffrée). Refuse identifiants, port, IP,
 * nom local ou réservé. `allowLab` accepte seulement `*.audigy.test`.
 */
export function normalizeSiteUrl(
  raw: string,
  options: { allowLab?: boolean } = {},
): SiteInput {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.length > MAX_URL_LENGTH)
    throw new InvalidSiteUrl('invalid_url');
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = validateTargetUrl(withScheme);
  } catch (error) {
    if (isNetError(error)) throw new InvalidSiteUrl('invalid_url');
    throw error;
  }
  if (url.port !== '') throw new InvalidSiteUrl('invalid_url');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isIP(host.replace(/^\[|\]$/g, '')) !== 0 || !HOST_RE.test(host))
    throw new InvalidSiteUrl('invalid_url');
  const lab = options.allowLab === true && host.endsWith(LAB_SUFFIX);
  const tld = host.slice(host.lastIndexOf('.') + 1);
  if (!lab && RESERVED_TLDS.includes(tld))
    throw new InvalidSiteUrl('invalid_url');

  const prefix = prefixOf(url.pathname);
  const scope = prefix === '/' ? 'origin' : 'path';
  return {
    url: scope === 'origin' ? `https://${host}` : `https://${host}${prefix}`,
    scope,
    host,
    pathPrefix: scope === 'origin' ? null : prefix,
    hosting: hostingFor(host),
    label: scope === 'origin' ? host : `${host}${prefix}`,
  };
}

/** Cible du moteur pour un site enregistré. */
export function targetOf(site: {
  url: string;
  scope: string;
  hosting: string;
}): Target {
  const href = site.url.endsWith('/') ? site.url : `${site.url}/`;
  return {
    url: new URL(href),
    scope: site.scope === 'path' ? 'path' : 'origin',
    hosting:
      site.hosting === 'netlify' || site.hosting === 'github_pages'
        ? site.hosting
        : 'other',
  };
}

/** Corps de `POST /api/audits`. Exactement une cible : `url` ou `siteId`. */
export const createAuditInput = z
  .strictObject({
    url: z.string().min(1).max(MAX_URL_LENGTH).optional(),
    siteId: z.uuid().optional(),
    mode: z.enum(['passive', 'active']).default('passive'),
  })
  .refine((v) => (v.url === undefined) !== (v.siteId === undefined), {
    message: 'url_or_site',
  });

export type CreateAuditInput = z.infer<typeof createAuditInput>;

export const auditIdSchema = z.uuid();
