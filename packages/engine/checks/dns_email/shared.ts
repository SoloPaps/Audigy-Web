import { type DnsAnswer, type DnsType, isNetError } from '@audigy/net';
import type { CheckContext, CheckResult, Status } from '../../src/types.js';
import { type MxRecord, parseMx } from './parse.js';

export class DnsCheckError extends Error {
  override readonly name = 'DnsCheckError';

  constructor(readonly kind: 'failure' | 'servfail') {
    super(kind);
  }
}

export function dnsName(name: string): string {
  const host = name.trim().toLowerCase();
  return host.endsWith('.') ? host.slice(0, -1) : host;
}

/** Nom audité : le préfixe www ne porte en général pas le courrier. */
export function mailDomain(hostname: string): string {
  const host = dnsName(hostname);
  return host.startsWith('www.') ? host.slice(4) : host;
}

export function blockedTarget(hostname: string): CheckResult | null {
  const host = dnsName(hostname);
  if (isIpHost(host)) return na('dns_email.na_address');
  if (host === 'github.io' || host.endsWith('.github.io'))
    return na('dns_email.na_github');
  return null;
}

function isIpHost(host: string): boolean {
  if (host.includes(':')) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function na(messageKey: string): CheckResult {
  return finding('na', 1, 1, messageKey);
}

export function finding(
  status: Status,
  severity: 1 | 2 | 3 | 4,
  impact: 1 | 2 | 3,
  messageKey: string,
  extra: {
    params?: Record<string, string | number>;
    measured?: Record<string, unknown>;
    fixKey?: string;
  } = {},
): CheckResult {
  const result: CheckResult = { status, severity, impact, messageKey };
  if (extra.params) result.params = extra.params;
  if (extra.measured) result.measured = extra.measured;
  if ((status === 'warn' || status === 'fail') && extra.fixKey)
    result.fixKey = extra.fixKey;
  if (status === 'untested' || status === 'na') result.reason = messageKey;
  return result;
}

export async function runDns(
  ctx: CheckContext,
  judge: (ctx: CheckContext, domain: string) => Promise<CheckResult>,
): Promise<CheckResult> {
  const blocked = blockedTarget(ctx.target.url.hostname);
  if (blocked) return blocked;
  try {
    return await judge(ctx, mailDomain(ctx.target.url.hostname));
  } catch (error) {
    if (error instanceof DnsCheckError) {
      return finding('untested', 1, 1, 'dns_email.untested', {
        measured: { kind: error.kind },
      });
    }
    throw error;
  }
}

export async function lookup(
  ctx: CheckContext,
  name: string,
  type: DnsType,
): Promise<DnsAnswer> {
  const host = dnsName(name);
  let answer: DnsAnswer;
  try {
    answer = await ctx.shared.get(`dns:${type}:${host}`, () =>
      ctx.net.dns.query(host, type),
    );
  } catch (error) {
    if (isNetError(error)) throw new DnsCheckError('failure');
    throw error;
  }
  if (answer.status !== 0 && answer.status !== 3)
    throw new DnsCheckError('servfail');
  return answer;
}

export function txtOf(answer: DnsAnswer): string[] {
  if (answer.status === 3) return [];
  return answer.records
    .filter((record) => record.type === 'TXT')
    .map((record) => record.data);
}

export type MxView =
  | { mode: 'hosts'; hosts: string[] }
  | { mode: 'null' }
  | { mode: 'absent' }
  | { mode: 'broken'; mix: boolean };

export async function readMx(
  ctx: CheckContext,
  domain: string,
): Promise<MxView> {
  const answer = await lookup(ctx, domain, 'MX');
  if (answer.status === 3) return { mode: 'absent' };
  const rows = answer.records.filter((record) => record.type === 'MX');
  if (rows.length === 0) return { mode: 'absent' };
  const parsed: MxRecord[] = [];
  for (const row of rows) {
    const mx = parseMx(row.data);
    if (!mx) return { mode: 'broken', mix: false };
    parsed.push(mx);
  }
  const nulls = parsed.filter((mx) => mx.exchange === '.');
  if (nulls.length === 0) {
    return { mode: 'hosts', hosts: parsed.map((mx) => mx.exchange) };
  }
  if (
    nulls.length === parsed.length &&
    parsed.length === 1 &&
    parsed[0]?.preference === 0
  ) {
    return { mode: 'null' };
  }
  return { mode: 'broken', mix: nulls.length !== parsed.length };
}

/** Le nom reçoit du courrier, ou tente de l’annoncer. */
export function intendsMail(mx: MxView): boolean {
  return mx.mode === 'hosts' || mx.mode === 'broken';
}
