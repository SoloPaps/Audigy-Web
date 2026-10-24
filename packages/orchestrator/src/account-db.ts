import { createHash } from 'node:crypto';
import {
  createServiceClient,
  createUserClient,
  type Database,
  dbEnvFrom,
  TERMS_VERSION,
} from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type AccountAction,
  type AccountDeps,
  type AccountExport,
  type AccountGateway,
  accountLimit,
  accountWindowStart,
  mergeArtifactPaths,
  OAUTH_EXPORT_FIELDS,
} from './account.js';
import type { Logger } from './log.js';

type Client = SupabaseClient<Database>;

const BUCKET = 'artifacts';
const REMOVE_CHUNK = 100;

type Site = Database['public']['Tables']['sites']['Row'];
type Verification = Database['public']['Tables']['site_verifications']['Row'];
type Audit = Database['public']['Tables']['audits']['Row'];
type Score = Database['public']['Tables']['domain_scores']['Row'];
type Finding = Database['public']['Tables']['findings']['Row'];
type Artifact = Database['public']['Tables']['artifacts']['Row'];
type Report = Database['public']['Tables']['reports']['Row'];
type Schedule = Database['public']['Tables']['schedules']['Row'];
type Daily = Database['public']['Tables']['uptime_daily']['Row'];
type Probe = Database['public']['Tables']['uptime_checks']['Row'];
type Incident = Database['public']['Tables']['incidents']['Row'];
type Alert = Database['public']['Tables']['alerts']['Row'];
type Place = Database['public']['Tables']['site_places']['Row'];
type Log = Database['public']['Tables']['audit_log']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Terms = Database['public']['Tables']['terms_acceptances']['Row'];

async function many<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error('account_read_failed');
  return data ?? [];
}

async function filesIn(service: Client, prefix: string): Promise<string[]> {
  const { data, error } = await service.storage.from(BUCKET).list(prefix, {
    limit: 1000,
  });
  if (error) throw new Error('storage_list_failed');
  const paths: string[] = [];
  for (const entry of data ?? []) {
    if (!entry.name || entry.id === null) continue;
    paths.push(prefix ? `${prefix}/${entry.name}` : entry.name);
  }
  return paths;
}

function supabaseGateway(
  service: Client,
  anon: Client,
  token: string,
): AccountGateway {
  return {
    async readExport(userId) {
      const email = await emailOf(anon, token);
      return loadExport(service, userId, email, new Date().toISOString());
    },

    async listArtifactPaths(userId) {
      const sites = await many<Pick<Site, 'id'>>(
        service.from('sites').select('id').eq('owner_id', userId),
      );
      const siteIds = sites.map((site) => site.id);
      if (siteIds.length === 0) return [];
      const audits = await many<Pick<Audit, 'id'>>(
        service.from('audits').select('id').in('site_id', siteIds),
      );
      const auditIds = audits.map((audit) => audit.id);
      if (auditIds.length === 0) return [];
      const rows = await many<Pick<Artifact, 'storage_path'>>(
        service
          .from('artifacts')
          .select('storage_path')
          .in('audit_id', auditIds),
      );
      const listed: string[] = [];
      for (const id of auditIds) {
        listed.push(...(await filesIn(service, id)));
        listed.push(...(await filesIn(service, `${id}/browser`)));
      }
      return mergeArtifactPaths(
        rows.map((row) => row.storage_path),
        listed,
      );
    },

    async removeStorage(paths) {
      for (let index = 0; index < paths.length; index += REMOVE_CHUNK) {
        const slice = paths.slice(index, index + REMOVE_CHUNK);
        const { error } = await service.storage.from(BUCKET).remove(slice);
        if (error) throw new Error('storage_delete_failed');
      }
    },

    async storageStillPresent(paths) {
      const byParent = new Map<string, string[]>();
      for (const path of paths) {
        const cut = path.lastIndexOf('/');
        const parent = cut >= 0 ? path.slice(0, cut) : '';
        const name = cut >= 0 ? path.slice(cut + 1) : path;
        const names = byParent.get(parent) ?? [];
        names.push(name);
        byParent.set(parent, names);
      }
      const left: string[] = [];
      for (const [parent, names] of byParent) {
        const { data, error } = await service.storage
          .from(BUCKET)
          .list(parent, {
            limit: 1000,
          });
        if (error) throw new Error('storage_list_failed');
        const found = new Set((data ?? []).map((entry) => entry.name));
        for (const name of names) {
          if (found.has(name)) left.push(parent ? `${parent}/${name}` : name);
        }
      }
      return left;
    },

    async deleteUser(userId) {
      const { error: logError } = await service
        .from('audit_log')
        .delete()
        .eq('actor', userId);
      if (logError) throw new Error('audit_log_delete_failed');
      const { error } = await service.auth.admin.deleteUser(userId);
      if (error) {
        const still = await profileExists(service, userId);
        if (still) throw new Error('auth_delete_failed');
      }
    },

    profileExists(userId) {
      return profileExists(service, userId);
    },

    async listTerms(userId) {
      const rows = await many<Pick<Terms, 'version' | 'accepted_at'>>(
        service
          .from('terms_acceptances')
          .select('version, accepted_at')
          .eq('user_id', userId),
      );
      return rows.map((row) => ({
        version: row.version,
        acceptedAt: row.accepted_at,
      }));
    },

    async acceptTerms(userId, version) {
      if (version !== TERMS_VERSION) throw new Error('terms_version');
      const { error } = await service.from('terms_acceptances').insert({
        user_id: userId,
        version,
      });
      if (error && error.code !== '23505')
        throw new Error('terms_insert_failed');
    },
  };
}

async function emailOf(anon: Client, token: string): Promise<string | null> {
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

async function profileExists(
  service: Client,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error('account_read_failed');
  return data !== null;
}

async function loadExport(
  service: Client,
  userId: string,
  email: string | null,
  exportedAt: string,
): Promise<AccountExport> {
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select(
      'id, display_name, locale, weekly_digest, email_opt_out, created_at',
    )
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw new Error('account_read_failed');

  const sites = await many<Site>(
    service.from('sites').select('*').eq('owner_id', userId),
  );
  const siteIds = sites.map((site) => site.id);
  const empty = siteIds.length === 0;

  const [terms, alerts, logs, oauth] = await Promise.all([
    many<Terms>(
      service.from('terms_acceptances').select('*').eq('user_id', userId),
    ),
    many<Alert>(service.from('alerts').select('*').eq('user_id', userId)),
    many<Log>(service.from('audit_log').select('*').eq('actor', userId)),
    many<{ provider: string }>(
      service
        .from('oauth_tokens')
        .select(oauthExportSelect())
        .eq('user_id', userId),
    ),
  ]);

  const verifications = empty
    ? []
    : await many<Verification>(
        service.from('site_verifications').select('*').in('site_id', siteIds),
      );
  const audits = empty
    ? []
    : await many<Audit>(
        service.from('audits').select('*').in('site_id', siteIds),
      );
  const auditIds = audits.map((audit) => audit.id);
  const noAudit = auditIds.length === 0;
  const schedules = empty
    ? []
    : await many<Schedule>(
        service.from('schedules').select('*').in('site_id', siteIds),
      );
  const daily = empty
    ? []
    : await many<Daily>(
        service.from('uptime_daily').select('*').in('site_id', siteIds),
      );
  const probes = empty
    ? []
    : await many<Probe>(
        service.from('uptime_checks').select('*').in('site_id', siteIds),
      );
  const incidents = empty
    ? []
    : await many<Incident>(
        service.from('incidents').select('*').in('site_id', siteIds),
      );
  const places = empty
    ? []
    : await many<Place>(
        service.from('site_places').select('*').in('site_id', siteIds),
      );
  const scores = noAudit
    ? []
    : await many<Score>(
        service.from('domain_scores').select('*').in('audit_id', auditIds),
      );
  const findings = noAudit
    ? []
    : await many<Finding>(
        service.from('findings').select('*').in('audit_id', auditIds),
      );
  const artifacts = noAudit
    ? []
    : await many<Artifact>(
        service.from('artifacts').select('*').in('audit_id', auditIds),
      );
  const reports = noAudit
    ? []
    : await many<Report>(
        service.from('reports').select('*').in('audit_id', auditIds),
      );

  return {
    exporteLe: exportedAt,
    versionCgu: TERMS_VERSION,
    profil: profile ? mapProfile(profile, email) : null,
    acceptations: terms.map((row) => ({
      version: row.version,
      accepteeLe: row.accepted_at,
    })),
    sites: sites.map(mapSite),
    verifications: verifications.map((row) => ({
      identifiant: row.id,
      site: row.site_id,
      methode: row.method,
      statut: row.status,
      jeton: row.token,
      creeLe: row.created_at,
      verifieLe: row.verified_at,
      controleLe: row.last_checked_at,
    })),
    audits: audits.map((row) => ({
      identifiant: row.id,
      site: row.site_id,
      declencheur: row.trigger,
      mode: row.mode,
      statut: row.status,
      methode: row.method_version,
      moteur: row.engine_version,
      score: row.global_score,
      couverture: row.coverage,
      creeLe: row.created_at,
      commenceLe: row.started_at,
      termineLe: row.finished_at,
      erreur: row.error,
    })),
    scores: scores.map((row) => ({
      audit: row.audit_id,
      domaine: row.domain,
      score: row.score,
      couverture: row.coverage,
      niveau: row.level,
    })),
    constats: findings.map((row) => ({
      audit: row.audit_id,
      domaine: row.domain,
      test: row.check_id,
      statut: row.status,
      gravite: row.severity,
      impact: row.impact,
      score: row.score,
      mesure: row.measured,
      cle: row.message_key,
      params: row.params,
      fiche: row.fix_key,
      effortMinutes: row.effort_minutes,
      raison: row.reason,
    })),
    artefacts: artifacts.map((row) => ({
      audit: row.audit_id,
      type: row.kind,
      chemin: row.storage_path,
      empreinte: row.sha256,
      octets: row.bytes,
    })),
    rapports: reports.map((row) => ({
      identifiant: row.id,
      audit: row.audit_id,
      jeton: row.share_token,
      visibilite: row.visibility,
      empreinte: row.manifest_sha256,
      horodatage: row.tsa,
      horodateLe: row.tsa_gen_time,
      signature: row.signature,
      revoqueLe: row.revoked_at,
    })),
    planifications: schedules.map((row) => ({
      site: row.site_id,
      cadence: row.cadence,
      prochainLe: row.next_run_at,
      actif: row.enabled,
      mode: row.mode,
    })),
    disponibilite: daily.map((row) => ({
      site: row.site_id,
      jour: row.day,
      controles: row.checks,
      echecs: row.failures,
      medianeMs: row.p50_ms,
    })),
    sondes: probes.map((row) => ({
      site: row.site_id,
      controleLe: row.checked_at,
      ok: row.ok,
      statut: row.status_code,
      ms: row.ms,
    })),
    incidents: incidents.map((row) => ({
      identifiant: row.id,
      site: row.site_id,
      commenceLe: row.started_at,
      resoluLe: row.resolved_at,
      cause: row.cause,
    })),
    alertes: alerts.map((row) => ({
      identifiant: row.id,
      site: row.site_id,
      type: row.kind,
      details: row.payload,
      envoyeLe: row.sent_at,
    })),
    lieux: places.map((row) => ({
      site: row.site_id,
      lieu: row.place_id,
      nom: row.place_name,
      adresse: row.place_address,
      confirmeLe: row.confirmed_at,
    })),
    journal: logs.map((row) => ({
      identifiant: row.id,
      action: row.action,
      cible: row.target,
      le: row.at,
      details: row.details,
    })),
    connexions: oauth.map((row) => ({ fournisseur: row.provider })),
  };
}

function mapProfile(
  profile: Profile,
  email: string | null,
): AccountExport['profil'] {
  return {
    identifiant: profile.id,
    nom: profile.display_name,
    langue: profile.locale,
    courriel: email,
    resumeHebdo: profile.weekly_digest,
    courrielCoupe: profile.email_opt_out,
    creeLe: profile.created_at,
  };
}

function mapSite(site: Site): AccountExport['sites'][number] {
  return {
    identifiant: site.id,
    adresse: site.url,
    portee: site.scope,
    hote: site.host,
    prefixe: site.path_prefix,
    libelle: site.label,
    hebergeur: site.hosting,
    public: site.is_public,
    slug: site.public_slug,
    supprimeLe: site.deleted_at,
  };
}

function oauthExportSelect(): 'provider' {
  if (OAUTH_EXPORT_FIELDS.length !== 1 || OAUTH_EXPORT_FIELDS[0] !== 'provider')
    throw new Error('oauth_export_fields');
  return 'provider';
}

async function takeAccountSlot(
  service: Client,
  userId: string,
  action: AccountAction,
): Promise<boolean> {
  const windowStart = accountWindowStart(action, new Date());
  const key = createHash('sha256')
    .update(`audigy:account:${action}:${userId}:${windowStart}`)
    .digest('hex');
  const { data, error } = await service
    .from('rate_limits')
    .select('count')
    .eq('key', key)
    .eq('window_start', windowStart)
    .maybeSingle();
  if (error) throw new Error('rate_limit');
  const count = data?.count ?? 0;
  if (count >= accountLimit(action)) return false;
  const { error: writeError } = await service
    .from('rate_limits')
    .upsert(
      { key, window_start: windowStart, count: count + 1 },
      { onConflict: 'key,window_start' },
    );
  if (writeError) throw new Error('rate_limit');
  return true;
}

export function accountDepsFromEnv(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}): AccountDeps {
  const db = dbEnvFrom(options.env);
  const service = createServiceClient(db);
  const anon = createUserClient(db);
  return {
    logger: options.logger,
    async userFromToken(token) {
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },
    gateway(token) {
      return supabaseGateway(service, anon, token);
    },
    takeSlot: (userId, action) => takeAccountSlot(service, userId, action),
  };
}
