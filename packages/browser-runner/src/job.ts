import { createHash } from 'node:crypto';
import { createServiceClient } from '@audigy/db';
import { z } from 'zod';
import type { BrowserAuditOptions, BrowserAuditOutput } from './run.js';

export const AuditIdSchema = z.uuid();

const OPEN_STATUSES = new Set(['queued', 'running']);
const BUCKET = 'artifacts';

export interface JobAudit {
  url: string;
  status: string;
}

export interface JobArtifact {
  auditId: string;
  kind: 'json' | 'screenshot';
  /** Chemin dans le seau privé `artifacts` : `<auditId>/browser/<fichier>`. */
  path: string;
  data: Buffer;
  contentType: string;
  sha256: string;
}

/** Accès aux données de l'audit. L'implémentation Supabase est `supabaseJobStore`. */
export interface JobStore {
  loadAudit(auditId: string): Promise<JobAudit | null>;
  saveArtifact(artifact: JobArtifact): Promise<void>;
}

export type JobErrorCode =
  | 'INVALID_AUDIT_ID'
  | 'AUDIT_NOT_FOUND'
  | 'AUDIT_CLOSED'
  | 'STORE';

export class JobError extends Error {
  readonly code: JobErrorCode;
  constructor(code: JobErrorCode, message: string) {
    super(message);
    this.name = 'JobError';
    this.code = code;
  }
}

export interface JobOptions {
  store: JobStore;
  run: (options: BrowserAuditOptions) => Promise<BrowserAuditOutput>;
  botUrl?: string;
}

export interface JobSummary {
  auditId: string;
  artifacts: string[];
  errors: number;
}

/**
 * Exécution déclenchée par `browser-audit.yml` : lit l'URL du site de l'audit, charge
 * la page (passif seulement, quel que soit le mode de l'audit) et range les artefacts.
 * La fusion dans les constats et le score relève de l'orchestration.
 */
export async function runJob(
  auditId: string,
  options: JobOptions,
): Promise<JobSummary> {
  const parsed = AuditIdSchema.safeParse(auditId);
  if (!parsed.success)
    throw new JobError('INVALID_AUDIT_ID', 'Identifiant d’audit invalide');
  const id = parsed.data;
  const audit = await options.store.loadAudit(id);
  if (!audit) throw new JobError('AUDIT_NOT_FOUND', 'Audit introuvable');
  if (!OPEN_STATUSES.has(audit.status))
    throw new JobError('AUDIT_CLOSED', `Audit déjà clos (${audit.status})`);

  const { result, screenshots } = await options.run({
    url: audit.url,
    ...(options.botUrl ? { botUrl: options.botUrl } : {}),
  });
  const files: JobArtifact[] = [
    artifact(
      id,
      'json',
      'results.json',
      Buffer.from(JSON.stringify(result)),
      'application/json',
    ),
    ...screenshots.map((shot) =>
      artifact(id, 'screenshot', shot.file, shot.data, 'image/webp'),
    ),
  ];
  for (const file of files) await options.store.saveArtifact(file);
  return {
    auditId: id,
    artifacts: files.map((f) => f.path),
    errors: result.errors.length,
  };
}

function artifact(
  auditId: string,
  kind: JobArtifact['kind'],
  name: string,
  data: Buffer,
  contentType: string,
): JobArtifact {
  return {
    auditId,
    kind,
    path: `${auditId}/browser/${name}`,
    data,
    contentType,
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}

/** Lecture de l'audit et écriture des artefacts avec la clé `service_role` (jamais loggée). */
export function supabaseJobStore(
  client: ReturnType<typeof createServiceClient>,
): JobStore {
  return {
    async loadAudit(auditId) {
      const { data, error } = await client
        .from('audits')
        .select('status, sites!inner(url, deleted_at)')
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw new JobError('STORE', 'Lecture de l’audit impossible');
      if (!data || data.sites.deleted_at !== null) return null;
      return { url: data.sites.url, status: data.status };
    },
    async saveArtifact(file) {
      const upload = await client.storage
        .from(BUCKET)
        .upload(file.path, file.data, {
          contentType: file.contentType,
          upsert: true,
        });
      if (upload.error)
        throw new JobError('STORE', 'Envoi de l’artefact impossible');
      const removed = await client
        .from('artifacts')
        .delete()
        .eq('audit_id', file.auditId)
        .eq('storage_path', file.path);
      if (removed.error)
        throw new JobError('STORE', 'Mise à jour de l’artefact impossible');
      const inserted = await client.from('artifacts').insert({
        audit_id: file.auditId,
        kind: file.kind,
        storage_path: file.path,
        sha256: file.sha256,
        bytes: file.data.length,
      });
      if (inserted.error)
        throw new JobError('STORE', 'Enregistrement de l’artefact impossible');
    },
  };
}

/** Lit `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (PLAN §9). Aucune valeur par défaut. */
export function jobStoreFromEnv(env: NodeJS.ProcessEnv): JobStore {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  return supabaseJobStore(createServiceClient({ url, serviceRoleKey }));
}
