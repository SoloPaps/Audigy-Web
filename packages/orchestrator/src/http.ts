import { type CreateDeps, createAudit } from './create.js';
import { errorCode, type Logger } from './log.js';
import type { ProcessResult } from './process.js';
import { auditIdSchema, createAuditInput } from './target.js';
import { TRIGGER_HEADER, verifyTrigger } from './trigger.js';

const MAX_BODY_BYTES = 4096;

export type ApiError =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'invalid_input'
  | 'invalid_url'
  | 'site_not_found'
  | 'audit_not_found'
  | 'unverified'
  | 'verification_not_found'
  | 'user_limit'
  | 'host_limit'
  | 'internal';

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/** Erreur : un code stable et sa clé i18n (`api.error.<code>`), jamais un message technique. */
export function apiError(
  status: number,
  error: ApiError,
  extra: Record<string, string | number> = {},
  headers: Record<string, string> = {},
): Response {
  return json(
    status,
    { error, messageKey: `api.error.${error}`, ...extra },
    headers,
  );
}

export function bearerToken(req: Request): string | null {
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]{16,4096})$/.exec(
    req.headers.get('authorization') ?? '',
  );
  return match?.[1] ?? null;
}

async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) throw new Error('too_large');
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error('too_large');
  return JSON.parse(text);
}

export interface FindingView {
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

export interface AuditView {
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
  domains: {
    domain: string;
    score: number | null;
    coverage: number;
    level: string;
  }[];
  /** Ordre de priorité : gravité, impact, effort, identifiant. */
  findings: FindingView[];
}

export interface ApiDeps {
  logger: Logger;
  userFromToken(token: string): Promise<string | null>;
  /** Dépendances de création liées à l'utilisateur (client RLS par requête). */
  createDeps(token: string, userId: string): CreateDeps;
  /** Lecture sous RLS : `null` si l'audit n'existe pas ou n'est pas à lui. */
  readAudit(token: string, auditId: string): Promise<AuditView | null>;
}

async function authenticate(
  req: Request,
  deps: ApiDeps,
): Promise<{ token: string; userId: string } | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const userId = await deps.userFromToken(token);
  return userId ? { token, userId } : null;
}

/** `POST /api/audits` : `{ url } | { siteId }`, `mode` facultatif (passif par défaut). */
export async function handleCreate(
  req: Request,
  deps: ApiDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  try {
    const auth = await authenticate(req, deps);
    if (!auth) return apiError(401, 'unauthorized');

    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = createAuditInput.safeParse(body);
    if (!parsed.success) return apiError(400, 'invalid_input');

    const result = await createAudit(
      deps.createDeps(auth.token, auth.userId),
      auth.userId,
      parsed.data,
    );
    switch (result.kind) {
      case 'created':
        return json(202, {
          auditId: result.auditId,
          status: 'queued',
          existing: false,
        });
      case 'existing':
        return json(200, { auditId: result.auditId, existing: true });
      case 'host_limit':
      case 'user_limit':
        return apiError(
          429,
          result.kind,
          { retryAfter: result.retryAfter },
          { 'retry-after': String(result.retryAfter) },
        );
      case 'invalid_url':
        return apiError(400, 'invalid_url');
      case 'site_not_found':
        return apiError(404, 'site_not_found');
      case 'unverified':
        return apiError(403, 'unverified');
    }
  } catch (error) {
    deps.logger.error('api_create_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

/** `GET /api/audits/:id` : audit, scores par domaine et constats (RLS propriétaire). */
export async function handleGet(
  req: Request,
  deps: ApiDeps,
  id: string | undefined,
): Promise<Response> {
  if (req.method !== 'GET')
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET' });
  try {
    const auth = await authenticate(req, deps);
    if (!auth) return apiError(401, 'unauthorized');
    const parsed = auditIdSchema.safeParse(id);
    if (!parsed.success) return apiError(400, 'invalid_input');
    const view = await deps.readAudit(auth.token, parsed.data);
    if (!view) return apiError(404, 'audit_not_found');
    return json(200, view);
  } catch (error) {
    deps.logger.error('api_get_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

/** Enveloppe d'une fonction Netlify : configuration absente = 500 sans détail. */
export async function serve(
  logger: Logger,
  build: () => Promise<Response>,
): Promise<Response> {
  try {
    return await build();
  } catch (error) {
    logger.error('api_unavailable', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

export interface RunDeps {
  /** Clé HMAC du réveil (`SUPABASE_SERVICE_ROLE_KEY`). */
  key: string;
  logger: Logger;
  process(): Promise<ProcessResult | null>;
  /** Réveille une autre invocation si un audit a été traité (la file se vide). */
  chain(): Promise<void>;
}

/** `audit-run-background` : réveil signé, puis un audit de la file. */
export async function handleRun(
  req: Request,
  deps: RunDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  if (!verifyTrigger(deps.key, req.headers.get(TRIGGER_HEADER)))
    return apiError(401, 'unauthorized');
  try {
    const result = await deps.process();
    if (result) {
      try {
        await deps.chain();
      } catch (error) {
        deps.logger.warn('audit_chain_failed', { code: errorCode(error) });
      }
    }
    return json(200, { processed: result?.auditId ?? null });
  } catch (error) {
    deps.logger.error('audit_run_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}
