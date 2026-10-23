import type { SafeResponse } from '@audigy/net';
import type { CheckContext, CheckResult, Status } from '../../src/types.js';

/** Seuil Observatory : six mois, en secondes. */
export const HSTS_SIX_MONTHS_SECONDS = 15_768_000;
/** Alerte certificat : moins de 30 jours. */
export const CERT_SOON_DAYS = 30;
/** Alerte security.txt : moins de 14 jours. */
export const SECURITY_TXT_SOON_DAYS = 14;
export const HOME_KEY = 'home';

const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function finding(
  id: string,
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
    reason?: string;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if (status === 'warn' || status === 'fail') result.fixKey = id;
  if (status === 'untested' || status === 'na')
    result.reason = extra.reason ?? messageKey;
  else if (extra.reason) result.reason = extra.reason;
  return result;
}

/** Page demandée, chargée une seule fois pour tout l'audit. */
export async function loadHome(ctx: CheckContext): Promise<SafeResponse> {
  return ctx.shared.get(HOME_KEY, () =>
    ctx.net.fetch(ctx.target.url, { signal: ctx.signal }),
  );
}

export function hostName(hostname: string): string {
  const host = hostname.toLowerCase();
  return host.endsWith('.') ? host.slice(0, -1) : host;
}

export function sameHost(a: URL, b: URL): boolean {
  return hostName(a.hostname) === hostName(b.hostname);
}

export function isHtml(headers: Headers): boolean {
  return /html/i.test(headers.get('content-type') ?? '');
}

/** Lignes Set-Cookie, sans fusionner les dates (virgules). */
export function cookieLines(headers: Headers): string[] {
  const bag = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof bag.getSetCookie === 'function') return bag.getSetCookie();
  const value = headers.get('set-cookie');
  return value === null ? [] : [value];
}

export function sameResource(a: URL, b: URL): boolean {
  const path = (value: string) =>
    value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  return (
    a.protocol === b.protocol &&
    a.host === b.host &&
    path(a.pathname) === path(b.pathname)
  );
}
