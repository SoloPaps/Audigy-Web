import { type Json, TERMS_VERSION } from '@audigy/db';
import { z } from 'zod';
import { apiError, bearerToken } from './http.js';
import { errorCode, type Logger } from './log.js';

const deleteBody = z.object({ confirm: z.literal('supprimer') });
const termsBody = z.object({ version: z.string().min(1).max(32) });

export interface AccountExport {
  exporteLe: string;
  versionCgu: string;
  profil: {
    identifiant: string;
    nom: string;
    langue: string;
    courriel: string | null;
    resumeHebdo: boolean;
    courrielCoupe: boolean;
    creeLe: string;
  } | null;
  acceptations: { version: string; accepteeLe: string }[];
  sites: {
    identifiant: string;
    adresse: string;
    portee: string;
    hote: string;
    prefixe: string | null;
    libelle: string;
    hebergeur: string;
    public: boolean;
    slug: string | null;
    supprimeLe: string | null;
  }[];
  verifications: {
    identifiant: string;
    site: string;
    methode: string;
    statut: string;
    jeton: string;
    creeLe: string;
    verifieLe: string | null;
    controleLe: string | null;
  }[];
  audits: {
    identifiant: string;
    site: string;
    declencheur: string;
    mode: string;
    statut: string;
    methode: string;
    moteur: string;
    score: number | null;
    couverture: number | null;
    creeLe: string;
    commenceLe: string | null;
    termineLe: string | null;
    erreur: string | null;
  }[];
  scores: {
    audit: string;
    domaine: string;
    score: number | null;
    couverture: number;
    niveau: string;
  }[];
  constats: {
    audit: string;
    domaine: string;
    test: string;
    statut: string;
    gravite: number;
    impact: number;
    score: number | null;
    mesure: Json;
    cle: string;
    params: Json;
    fiche: string | null;
    effortMinutes: number | null;
    raison: string | null;
  }[];
  artefacts: {
    audit: string;
    type: string;
    chemin: string;
    empreinte: string;
    octets: number;
  }[];
  rapports: {
    identifiant: string;
    audit: string;
    jeton: string;
    visibilite: string;
    empreinte: string | null;
    horodatage: string | null;
    horodateLe: string | null;
    signature: string | null;
    revoqueLe: string | null;
  }[];
  planifications: {
    site: string;
    cadence: string;
    prochainLe: string;
    actif: boolean;
    mode: string;
  }[];
  disponibilite: {
    site: string;
    jour: string;
    controles: number;
    echecs: number;
    medianeMs: number | null;
  }[];
  sondes: {
    site: string;
    controleLe: string;
    ok: boolean;
    statut: number | null;
    ms: number | null;
  }[];
  incidents: {
    identifiant: string;
    site: string;
    commenceLe: string;
    resoluLe: string | null;
    cause: string | null;
  }[];
  alertes: {
    identifiant: string;
    site: string;
    type: string;
    details: Json;
    envoyeLe: string | null;
  }[];
  lieux: {
    site: string;
    lieu: string;
    nom: string;
    adresse: string;
    confirmeLe: string;
  }[];
  journal: {
    identifiant: string;
    action: string;
    cible: string | null;
    le: string;
    details: Json;
  }[];
  /** Fournisseur seulement : jamais le jeton chiffré. */
  connexions: { fournisseur: string }[];
}

/** Colonnes lues dans `oauth_tokens`. Le secret n’en fait pas partie. */
export const OAUTH_EXPORT_FIELDS = ['provider'] as const;

export function mergeArtifactPaths(
  ...groups: readonly (readonly string[])[]
): string[] {
  return [...new Set(groups.flat())];
}

export interface AccountGateway {
  readExport(userId: string): Promise<AccountExport>;
  listArtifactPaths(userId: string): Promise<string[]>;
  removeStorage(paths: string[]): Promise<void>;
  storageStillPresent(paths: string[]): Promise<string[]>;
  /** Journal de l’acteur, puis compte (cascade : sites, audits, artefacts). */
  deleteUser(userId: string): Promise<void>;
  profileExists(userId: string): Promise<boolean>;
  listTerms(userId: string): Promise<{ version: string; acceptedAt: string }[]>;
  acceptTerms(userId: string, version: string): Promise<void>;
}

export interface AccountDeps {
  logger: Logger;
  userFromToken(token: string): Promise<string | null>;
  gateway(token: string, userId: string): AccountGateway;
}

/**
 * Efface le stockage privé, puis le compte.
 * Si un fichier reste, le compte n’est pas supprimé.
 */
export async function deleteAccount(
  gateway: AccountGateway,
  userId: string,
): Promise<void> {
  const paths = mergeArtifactPaths(await gateway.listArtifactPaths(userId));
  if (paths.length > 0) await gateway.removeStorage(paths);
  const left = await gateway.storageStillPresent(paths);
  if (left.length > 0) throw new Error('artifacts_remain');
  await gateway.deleteUser(userId);
  if (await gateway.profileExists(userId)) throw new Error('account_remains');
  const again = await gateway.listArtifactPaths(userId);
  if (again.length > 0) throw new Error('artifacts_remain');
}

function json(
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

async function authenticate(
  req: Request,
  deps: AccountDeps,
): Promise<{ token: string; userId: string } | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const userId = await deps.userFromToken(token);
  return userId ? { token, userId } : null;
}

async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > 4096) throw new Error('too_large');
  const text = await req.text();
  if (Buffer.byteLength(text) > 4096) throw new Error('too_large');
  return JSON.parse(text);
}

function fail(deps: AccountDeps, error: unknown, event: string): Response {
  const code = errorCode(error);
  if (code === 'terms_version') return apiError(409, 'terms_version');
  deps.logger.error(event, { code });
  return apiError(500, 'internal');
}

async function handleExport(
  req: Request,
  deps: AccountDeps,
): Promise<Response> {
  if (req.method !== 'GET')
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET' });
  const auth = await authenticate(req, deps);
  if (!auth) return apiError(401, 'unauthorized');
  try {
    const data = await deps
      .gateway(auth.token, auth.userId)
      .readExport(auth.userId);
    return json(200, data, {
      'content-disposition': 'attachment; filename="audigy-donnees.json"',
    });
  } catch (error) {
    return fail(deps, error, 'account_export_failed');
  }
}

async function handleTerms(req: Request, deps: AccountDeps): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'GET, POST' });
  const auth = await authenticate(req, deps);
  if (!auth) return apiError(401, 'unauthorized');
  const gateway = deps.gateway(auth.token, auth.userId);
  try {
    if (req.method === 'GET') {
      const rows = await gateway.listTerms(auth.userId);
      const current = rows.find((row) => row.version === TERMS_VERSION);
      return json(200, {
        version: TERMS_VERSION,
        accepted: current !== undefined,
        acceptedAt: current?.acceptedAt ?? null,
      });
    }
    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return apiError(400, 'invalid_input');
    }
    const parsed = termsBody.safeParse(body);
    if (!parsed.success) return apiError(400, 'invalid_input');
    if (parsed.data.version !== TERMS_VERSION)
      return apiError(409, 'terms_version');
    await gateway.acceptTerms(auth.userId, parsed.data.version);
    return json(200, { version: TERMS_VERSION, accepted: true });
  } catch (error) {
    return fail(deps, error, 'account_terms_failed');
  }
}

async function handleDelete(
  req: Request,
  deps: AccountDeps,
): Promise<Response> {
  if (req.method !== 'POST')
    return apiError(405, 'method_not_allowed', {}, { allow: 'POST' });
  const auth = await authenticate(req, deps);
  if (!auth) return apiError(401, 'unauthorized');
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return apiError(400, 'invalid_input');
  }
  if (!deleteBody.safeParse(body).success)
    return apiError(400, 'invalid_input');
  try {
    await deleteAccount(deps.gateway(auth.token, auth.userId), auth.userId);
    return json(200, { deleted: true });
  } catch (error) {
    return fail(deps, error, 'account_delete_failed');
  }
}

/** `GET|POST /api/compte/:action` — export, cgu, suppression. */
export async function handleAccount(
  req: Request,
  deps: AccountDeps,
  action: string | undefined,
): Promise<Response> {
  if (action === 'export') return handleExport(req, deps);
  if (action === 'cgu') return handleTerms(req, deps);
  if (action === 'suppression') return handleDelete(req, deps);
  return apiError(404, 'invalid_input');
}
