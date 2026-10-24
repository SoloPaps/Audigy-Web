import { type MessageKey, t } from '../i18n/index.js';
import { translate } from './translate.js';

export interface ApiFinding {
  domain: string;
  checkId: string;
  status: string;
  severity: number;
  impact: number;
  score: number | null;
  measured: unknown;
  messageKey: string;
  params: unknown;
  fixKey: string | null;
  effortMinutes: number | null;
  reason: string | null;
}

export interface ApiDomain {
  domain: string;
  score: number | null;
  coverage: number;
  level: string;
}

export interface AuditPayload {
  audit: {
    id: string;
    status: string;
    mode: string;
    trigger: string;
    methodVersion: string;
    engineVersion: string;
    globalScore: number | null;
    coverage: number | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    site: {
      id: string;
      url: string;
      label: string;
      scope: string;
      hosting: string;
    };
  };
  domains: ApiDomain[];
  findings: ApiFinding[];
}

export type CreateOutcome =
  | { ok: true; auditId: string }
  | { ok: false; message: string };

function messageFromBody(body: unknown, fallback: MessageKey): string {
  if (!body || typeof body !== 'object') return t(fallback);
  const record = body as { messageKey?: unknown; retryAfter?: unknown };
  const key = typeof record.messageKey === 'string' ? record.messageKey : '';
  const text = translate(key) ?? t(fallback);
  const retry = record.retryAfter;
  if (typeof retry !== 'number' || !Number.isFinite(retry) || retry <= 0) {
    return text;
  }
  if (retry >= 60) {
    return `${text} ${t('audit.retry.minutes', { minutes: Math.ceil(retry / 60) })}`;
  }
  return `${text} ${t('audit.retry.seconds', { seconds: Math.round(retry) })}`;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function createAudit(
  token: string,
  input: { url: string } | { siteId: string },
): Promise<CreateOutcome> {
  let response: Response;
  try {
    response = await fetch('/api/audits', {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, message: t('api.error.internal') };
  }
  const body = await readBody(response);
  if (response.ok && body && typeof body === 'object') {
    const auditId = (body as { auditId?: unknown }).auditId;
    if (typeof auditId === 'string' && auditId !== '') {
      return { ok: true, auditId };
    }
  }
  if (response.status === 401) {
    return { ok: false, message: t('api.error.unauthorized') };
  }
  return { ok: false, message: messageFromBody(body, 'api.error.internal') };
}

function isPayload(value: unknown): value is AuditPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as { audit?: { id?: unknown }; findings?: unknown };
  return typeof record.audit?.id === 'string' && Array.isArray(record.findings);
}

export async function readAudit(
  token: string,
  auditId: string,
): Promise<
  | { ok: true; payload: AuditPayload }
  | { ok: false; status: number; message: string }
> {
  let response: Response;
  try {
    response = await fetch(`/api/audits/${encodeURIComponent(auditId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, status: 0, message: t('api.error.internal') };
  }
  const body = await readBody(response);
  if (response.ok && isPayload(body)) return { ok: true, payload: body };
  if (response.status === 401) {
    return { ok: false, status: 401, message: t('api.error.unauthorized') };
  }
  if (response.status === 404) {
    return { ok: false, status: 404, message: t('api.error.audit_not_found') };
  }
  return {
    ok: false,
    status: response.status,
    message: messageFromBody(body, 'api.error.internal'),
  };
}
