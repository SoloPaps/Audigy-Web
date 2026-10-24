import {
  buildChallenge,
  generateToken,
  type ProbeOutcome,
  VERIFICATION_METHODS,
  type VerificationMethod,
} from '@audigy/engine';
import { z } from 'zod';
import {
  type AuditEvent,
  applyProbe,
  checkEvent,
  createEvent,
} from './decide.js';
import { apiError, bearerToken } from './http.js';
import { errorCode, type Logger } from './log.js';
import { TRIGGER_HEADER, verifyTrigger } from './trigger.js';

const MAX_BODY_BYTES = 4096;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) throw new Error('too_large');
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error('too_large');
  if (text.trim() === '') return {};
  return JSON.parse(text);
}

export interface OwnedSite {
  id: string;
  ownerId: string;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export interface OwnedVerification {
  id: string;
  siteId: string;
  ownerId: string;
  method: VerificationMethod;
  token: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verifiedAt: string | null;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

export interface VerificationPatch {
  id: string;
  status: OwnedVerification['status'];
  verifiedAt: string | null;
  lastCheckedAt: string;
  evidence: {
    host: string;
    scope: 'origin' | 'path';
    pathPrefix: string | null;
    location: string;
  };
}

export interface VerificationDeps {
  logger: Logger;
  userFromToken(token: string): Promise<string | null>;
  loadSite(userId: string, siteId: string): Promise<OwnedSite | null>;
  loadVerification(
    userId: string,
    verificationId: string,
  ): Promise<OwnedVerification | null>;
  insertPending(input: {
    siteId: string;
    method: VerificationMethod;
    token: string;
    evidence: VerificationPatch['evidence'];
  }): Promise<string>;
  save(patch: VerificationPatch): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  notifyExpired(input: {
    userId: string;
    siteId: string;
    method: string;
  }): Promise<void>;
  probe(
    method: VerificationMethod,
    token: string,
    site: OwnedSite,
  ): Promise<{ outcome: ProbeOutcome; location: string }>;
  now(): Date;
}

const createBody = z.strictObject({
  siteId: z.uuid(),
  method: z.enum(VERIFICATION_METHODS),
});

const checkBody = z.strictObject({
  verificationId: z.uuid(),
});

function siteOf(site: OwnedSite) {
  return {
    host: site.host,
    scope: site.scope,
    pathPrefix: site.pathPrefix,
  };
}

function view(site: OwnedSite, method: VerificationMethod, token: string) {
  const challenge = buildChallenge(siteOf(site), method, token);
  return {
    method: challenge.method,
    token: challenge.token,
    dnsName: challenge.dnsName,
    dnsValue: challenge.dnsValue,
    fileUrl: challenge.fileUrl,
    pageUrl: challenge.pageUrl,
    metaTag: challenge.metaTag,
  };
}

async function authenticate(
  req: Request,
  deps: VerificationDeps,
): Promise<{ userId: string } | Response> {
  const token = bearerToken(req);
  if (!token) return apiError(401, 'unauthorized');
  const userId = await deps.userFromToken(token);
  if (!userId) return apiError(401, 'unauthorized');
  return { userId };
}

function isResponse(value: { userId: string } | Response): value is Response {
  return value instanceof Response;
}

/** `POST /api/verifications` : prépare un jeton. Le statut reste `pending`. */
export async function handleCreateVerification(
  req: Request,
  deps: VerificationDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  try {
    const auth = await authenticate(req, deps);
    if (isResponse(auth)) return auth;
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = createBody.safeParse(body);
    if (!parsed.success) return apiError(400, 'invalid_input');
    const site = await deps.loadSite(auth.userId, parsed.data.siteId);
    if (!site) return apiError(404, 'site_not_found');
    const token = generateToken();
    const challenge = buildChallenge(siteOf(site), parsed.data.method, token);
    const id = await deps.insertPending({
      siteId: site.id,
      method: parsed.data.method,
      token,
      evidence: {
        host: site.host,
        scope: site.scope,
        pathPrefix: site.pathPrefix,
        location:
          parsed.data.method === 'dns_txt'
            ? challenge.dnsName
            : parsed.data.method === 'file'
              ? challenge.fileUrl
              : challenge.pageUrl,
      },
    });
    await deps.appendAudit(
      createEvent({
        actor: auth.userId,
        siteId: site.id,
        verificationId: id,
        method: parsed.data.method,
      }),
    );
    deps.logger.info('verification_created', {
      verificationId: id,
      siteId: site.id,
      method: parsed.data.method,
    });
    return json(201, {
      id,
      status: 'pending',
      ...view(site, parsed.data.method, token),
    });
  } catch (error) {
    deps.logger.error('verification_create_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

/** `POST /api/verifications/check` : relit la preuve et peut passer à `expired`. */
export async function handleCheckVerification(
  req: Request,
  deps: VerificationDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  try {
    const auth = await authenticate(req, deps);
    if (isResponse(auth)) return auth;
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = checkBody.safeParse(body);
    if (!parsed.success) return apiError(400, 'invalid_input');
    const row = await deps.loadVerification(
      auth.userId,
      parsed.data.verificationId,
    );
    if (!row) return apiError(404, 'verification_not_found');
    const site = await deps.loadSite(auth.userId, row.siteId);
    if (!site) return apiError(404, 'site_not_found');
    const read = await deps.probe(row.method, row.token, site);
    return finishCheck(
      deps,
      auth.userId,
      row,
      site,
      read.outcome,
      read.location,
    );
  } catch (error) {
    deps.logger.error('verification_check_failed', { code: errorCode(error) });
    return apiError(500, 'internal');
  }
}

async function finishCheck(
  deps: VerificationDeps,
  userId: string,
  row: OwnedVerification,
  site: OwnedSite,
  outcome: 'present' | 'absent' | 'error',
  location: string,
): Promise<Response> {
  const applied = applyProbe({ previous: row.status, outcome });
  const checkedAt = deps.now().toISOString();
  if (outcome !== 'error') {
    await deps.save({
      id: row.id,
      status: applied.status,
      verifiedAt:
        applied.status === 'verified'
          ? (row.verifiedAt ?? checkedAt)
          : row.verifiedAt,
      lastCheckedAt: checkedAt,
      evidence: {
        host: site.host,
        scope: site.scope,
        pathPrefix: site.pathPrefix,
        location,
      },
    });
  }
  if (applied.alert) {
    await deps.notifyExpired({
      userId,
      siteId: row.siteId,
      method: row.method,
    });
  }
  await deps.appendAudit(
    checkEvent({
      actor: userId,
      siteId: row.siteId,
      verificationId: row.id,
      method: row.method,
      status: applied.status,
      found: applied.found,
      inconclusive: applied.inconclusive,
      action: applied.action,
    }),
  );
  deps.logger.info('verification_checked', {
    verificationId: row.id,
    siteId: row.siteId,
    status: applied.status,
    found: applied.found,
  });
  return json(200, {
    id: row.id,
    status: applied.status,
    found: applied.found,
    inconclusive: applied.inconclusive,
    ...view(site, row.method, row.token),
  });
}

export interface RecheckDeps {
  key: string;
  logger: Logger;
  recheck(): Promise<{ checked: number; expired: number }>;
}

/** Relit les preuves dues. Réveil signé, comme `audit-run-background`. */
export async function handleRecheck(
  req: Request,
  deps: RecheckDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  if (!verifyTrigger(deps.key, req.headers.get(TRIGGER_HEADER)))
    return apiError(401, 'unauthorized');
  try {
    const result = await deps.recheck();
    deps.logger.info('verification_recheck_batch', result);
    return json(200, result);
  } catch (error) {
    deps.logger.error('verification_recheck_failed', {
      code: errorCode(error),
    });
    return apiError(500, 'internal');
  }
}
