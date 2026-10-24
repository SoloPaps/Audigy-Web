import type { DohResolver, SafeFetch, SafeResponse } from '@audigy/net';
import { isNetError } from '@audigy/net';
import type { Target } from './types.js';

export const VERIFICATION_METHODS = ['dns_txt', 'file', 'meta'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

/** Jeton public : assez long, sans ambiguïté dans un fichier ou une balise. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
/** La preuve doit avoir été revérifiée il y a strictement moins de 10 minutes. */
export const FRESH_MS = 10 * 60 * 1000;
export const CHALLENGE_LABEL = 'audigy-site-verification';
export const FILE_NAME = 'audigy-verification.txt';
export const META_NAME = 'audigy-verification';

export interface OwnershipSite {
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export interface ProofRecord {
  status: string;
  method: string;
  lastCheckedAt: Date | null;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export type ActiveRefusal = 'missing' | 'status' | 'stale' | 'scope';

export function generateToken(bytes: Uint8Array = randomTokenBytes()): string {
  const token = base64url(bytes);
  if (!TOKEN_RE.test(token)) throw new Error('token_invalid');
  return token;
}

export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/** `www` est retiré. Les autres sous-domaines restent le nom du site. */
export function dnsDomain(host: string): string {
  const bare = normalizeHost(host);
  return bare.startsWith('www.') ? bare.slice(4) : bare;
}

export function challengeName(host: string): string {
  return `_audigy-challenge.${dnsDomain(host)}`;
}

export function challengeValue(token: string): string {
  return `${CHALLENGE_LABEL}=${token}`;
}

export function normalizePrefix(
  path: string | null | undefined,
): string | null {
  if (!path || path === '/') return null;
  let value = path.startsWith('/') ? path : `/${path}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

/**
 * DNS TXT couvre tout le nom. Un fichier ou une balise sur un chemin
 * ne couvre pas le reste du site.
 */
export function scopesMatch(proof: ProofRecord, site: OwnershipSite): boolean {
  if (normalizeHost(proof.host) === '' || normalizeHost(site.host) === '')
    return false;
  if (normalizeHost(proof.host) !== normalizeHost(site.host)) return false;
  if (proof.method === 'dns_txt') return true;
  const proofPath = normalizePrefix(proof.pathPrefix);
  if (proof.scope === 'origin' || proofPath === null) return true;
  if (site.scope !== 'path') return false;
  return proofPath === normalizePrefix(site.pathPrefix);
}

/** Fraîche si l’âge est positif et strictement inférieur à 10 minutes. */
export function isFresh(lastCheckedAt: Date | null, now: Date): boolean {
  if (!lastCheckedAt || Number.isNaN(lastCheckedAt.getTime())) return false;
  const age = now.getTime() - lastCheckedAt.getTime();
  return age >= 0 && age < FRESH_MS;
}

export function activeAllowed(
  proof: ProofRecord | null,
  site: OwnershipSite,
  now: Date,
): { ok: true } | { ok: false; reason: ActiveRefusal } {
  if (!proof) return { ok: false, reason: 'missing' };
  if (proof.status !== 'verified') return { ok: false, reason: 'status' };
  if (!scopesMatch(proof, site)) return { ok: false, reason: 'scope' };
  if (!isFresh(proof.lastCheckedAt, now)) return { ok: false, reason: 'stale' };
  return { ok: true };
}

export function siteFromTarget(target: Target): OwnershipSite {
  return {
    host: target.url.hostname,
    scope: target.scope,
    pathPrefix:
      target.scope === 'path' ? normalizePrefix(target.url.pathname) : null,
  };
}

export function siteBase(site: OwnershipSite): URL {
  const host = normalizeHost(site.host);
  if (site.scope === 'path') {
    const prefix = normalizePrefix(site.pathPrefix) ?? '/';
    return new URL(`https://${host}${prefix}`);
  }
  return new URL(`https://${host}/`);
}

/** Adresse sous la portée. Un `..` est refusé. */
export function scopedUrl(site: OwnershipSite, relative: string): URL {
  const clean = relative.replace(/^\/+/, '');
  if (clean.split('/').includes('..')) throw new Error('path_escape');
  return new URL(clean, siteBase(site));
}

export function verificationFileUrl(site: OwnershipSite): URL {
  return scopedUrl(site, FILE_NAME);
}

export interface ChallengeView {
  method: VerificationMethod;
  token: string;
  dnsName: string;
  dnsValue: string;
  fileUrl: string;
  pageUrl: string;
  metaTag: string;
}

export function buildChallenge(
  site: OwnershipSite,
  method: VerificationMethod,
  token: string,
): ChallengeView {
  if (!TOKEN_RE.test(token)) throw new Error('token_invalid');
  return {
    method,
    token,
    dnsName: challengeName(site.host),
    dnsValue: challengeValue(token),
    fileUrl: verificationFileUrl(site).href,
    pageUrl: siteBase(site).href,
    metaTag: `<meta name="${META_NAME}" content="${escapeAttr(token)}">`,
  };
}

export type ProbeOutcome = 'present' | 'absent' | 'error';

export async function probeOwnership(
  method: VerificationMethod,
  token: string,
  site: OwnershipSite,
  net: { fetch: SafeFetch; dns: DohResolver },
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  if (!TOKEN_RE.test(token)) return { outcome: 'error', location: '' };
  if (method === 'dns_txt') return probeDns(token, site, net.dns);
  if (method === 'file') return probeFile(token, site, net.fetch, signal);
  return probeMeta(token, site, net.fetch, signal);
}

/** Valeur de la balise, ou `null` si elle est absente. */
export function metaContent(html: string): string | null {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const raw = tag[0] ?? '';
    const name = attr(raw, 'name');
    if (name?.toLowerCase() !== META_NAME) continue;
    return attr(raw, 'content');
  }
  return null;
}

export function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 400).trimStart().toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<head') ||
    head.startsWith('<body')
  );
}

function randomTokenBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

function attr(tag: string, key: string): string | null {
  const match = new RegExp(
    `\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    'i',
  ).exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? '';
}

async function probeDns(
  token: string,
  site: OwnershipSite,
  dns: DohResolver,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const location = challengeName(site.host);
  const expected = challengeValue(token);
  try {
    const answer = await dns.query(location, 'TXT');
    if (answer.status === 3) return { outcome: 'absent', location };
    if (answer.status !== 0) return { outcome: 'error', location };
    const found = answer.records.some(
      (record) => record.type === 'TXT' && record.data.trim() === expected,
    );
    return { outcome: found ? 'present' : 'absent', location };
  } catch (error) {
    if (isNetError(error)) return { outcome: 'error', location };
    throw error;
  }
}

async function probeFile(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = verificationFileUrl(site);
  try {
    const res = await fetch(url, signal ? { signal } : {});
    if (res.status === 404 || res.status === 410) {
      return { outcome: 'absent', location: url.href };
    }
    if (res.status !== 200) return { outcome: 'error', location: url.href };
    return {
      outcome: fileHasToken(res, token) ? 'present' : 'absent',
      location: url.href,
    };
  } catch (error) {
    if (isNetError(error)) return { outcome: 'error', location: url.href };
    throw error;
  }
}

async function probeMeta(
  token: string,
  site: OwnershipSite,
  fetch: SafeFetch,
  signal?: AbortSignal,
): Promise<{ outcome: ProbeOutcome; location: string }> {
  const url = siteBase(site);
  try {
    const res = await fetch(url, signal ? { signal } : {});
    if (res.status === 404 || res.status === 410) {
      return { outcome: 'absent', location: url.href };
    }
    if (res.status !== 200) return { outcome: 'error', location: url.href };
    return {
      outcome: metaContent(res.text()) === token ? 'present' : 'absent',
      location: url.href,
    };
  } catch (error) {
    if (isNetError(error)) return { outcome: 'error', location: url.href };
    throw error;
  }
}

function fileHasToken(res: SafeResponse, token: string): boolean {
  const text = res
    .text()
    .replace(/^\uFEFF/, '')
    .trim();
  if (text === token) return true;
  if (looksLikeHtml(text)) return false;
  return text.split(/\r?\n/).some((line) => line.trim() === token);
}
