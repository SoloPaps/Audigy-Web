import type { SpfTerm } from './parse.js';
import { isSpf, parseSpf } from './parse.js';
import { dnsName } from './shared.js';

/**
 * Compte les consultations SPF (RFC 7208 §4.6.4).
 * Chaque terme `include`, `a`, `mx`, `ptr`, `exists` ou `redirect` compte pour un.
 * Pour `mx`, chaque serveur annoncé compte en plus.
 * Le total est un maximum : les termes publiés sont suivis, sans s’arrêter sur une adresse.
 * `all` arrête le décompte, car il correspond toujours.
 * Au-delà de 10, ou de 2 consultations vides, le résultat est une erreur permanente.
 */

const LOOKUP_LIMIT = 10;
const VOID_LIMIT = 2;

export interface SpfDns {
  txt(name: string): Promise<string[]>;
  /** Serveurs MX, liste vide si MX nul, `none` si absent, `bad` si illisible. */
  mx(name: string): Promise<string[] | 'none' | 'bad'>;
  hasAddress(name: string): Promise<boolean>;
}

export type SpfProblem = 'syntax' | 'multiple' | 'lookups' | 'void' | 'loop';

export type SpfAssessment =
  | { ok: false; error: SpfProblem; lookups: number }
  | {
      ok: true;
      lookups: number;
      all: '+' | '-' | '~' | '?' | null;
      sending: boolean;
      ptr: boolean;
      macro: boolean;
    };

interface Acc {
  lookups: number;
  voids: number;
  seen: Set<string>;
  ptr: boolean;
  macro: boolean;
  sending: boolean;
  all: '+' | '-' | '~' | '?' | null;
}

export async function assessSpf(
  domain: string,
  record: string,
  dns: SpfDns,
): Promise<SpfAssessment> {
  const acc: Acc = {
    lookups: 0,
    voids: 0,
    seen: new Set(),
    ptr: false,
    macro: false,
    sending: false,
    all: null,
  };
  const error = await evalRecord(dnsName(domain), record, acc, dns);
  if (error) return { ok: false, error, lookups: acc.lookups };
  return {
    ok: true,
    lookups: acc.lookups,
    all: acc.all,
    sending: acc.sending,
    ptr: acc.ptr,
    macro: acc.macro,
  };
}

async function evalRecord(
  domain: string,
  record: string,
  acc: Acc,
  dns: SpfDns,
): Promise<SpfProblem | null> {
  if (acc.seen.has(domain)) return 'loop';
  acc.seen.add(domain);
  const terms = parseSpf(record);
  if (!terms) return 'syntax';
  let redirect: Extract<SpfTerm, { kind: 'redirect' }> | null = null;
  for (const term of terms) {
    if (term.kind === 'all') {
      acc.all = term.qualifier;
      return null;
    }
    if (term.kind === 'redirect') {
      redirect = term;
      continue;
    }
    if (term.kind === 'exp') continue;
    if (term.qualifier !== '-') acc.sending = true;
    if (!isLookup(term)) continue;
    if (term.kind === 'ptr') acc.ptr = true;
    const problem = await charge(term, domain, acc, dns);
    if (problem) return problem;
  }
  if (!redirect) return null;
  const charged = addLookups(acc, 1);
  if (charged) return charged;
  if (redirect.macro) {
    acc.macro = true;
    return null;
  }
  return follow(dnsName(redirect.domain), acc, dns);
}

type LookupTerm = Extract<
  SpfTerm,
  { kind: 'include' | 'exists' | 'a' | 'mx' | 'ptr' }
>;

function isLookup(term: SpfTerm): term is LookupTerm {
  return (
    term.kind === 'include' ||
    term.kind === 'exists' ||
    term.kind === 'a' ||
    term.kind === 'mx' ||
    term.kind === 'ptr'
  );
}

async function charge(
  term: LookupTerm,
  current: string,
  acc: Acc,
  dns: SpfDns,
): Promise<SpfProblem | null> {
  const charged = addLookups(acc, 1);
  if (charged) return charged;
  if (term.macro) {
    acc.macro = true;
    return null;
  }
  if (term.kind === 'include') return follow(dnsName(term.domain), acc, dns);
  if (term.kind === 'ptr') return null;
  if (term.kind === 'mx')
    return chargeMx(dnsName(term.domain ?? current), acc, dns);
  const name = dnsName(term.domain ?? current);
  const exists = await dns.hasAddress(name);
  if (!exists) return addVoid(acc);
  return null;
}

async function chargeMx(
  name: string,
  acc: Acc,
  dns: SpfDns,
): Promise<SpfProblem | null> {
  const result = await dns.mx(name);
  if (result === 'bad') return 'syntax';
  if (result === 'none') return addVoid(acc);
  return addLookups(acc, result.length);
}

async function follow(
  target: string,
  acc: Acc,
  dns: SpfDns,
): Promise<SpfProblem | null> {
  if (acc.seen.has(target)) return 'loop';
  const records = (await dns.txt(target)).filter(isSpf);
  if (records.length === 0) return addVoid(acc);
  if (records.length > 1) return 'multiple';
  const text = records[0];
  if (text === undefined) return 'syntax';
  return evalRecord(target, text, acc, dns);
}

function addLookups(acc: Acc, count: number): 'lookups' | null {
  acc.lookups += count;
  return acc.lookups > LOOKUP_LIMIT ? 'lookups' : null;
}

function addVoid(acc: Acc): 'void' | null {
  acc.voids += 1;
  return acc.voids > VOID_LIMIT ? 'void' : null;
}
