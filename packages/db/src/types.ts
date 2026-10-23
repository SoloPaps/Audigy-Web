/** Vocabulaire aligné sur le moteur et le schéma §8. */

export const SCORE_LEVELS = ['good', 'improve', 'problem', 'untested'] as const;
export type ScoreLevel = (typeof SCORE_LEVELS)[number];

export const SITE_SCOPES = ['origin', 'path'] as const;
export type SiteScope = (typeof SITE_SCOPES)[number];

export const HOSTINGS = ['netlify', 'github_pages', 'other'] as const;
export type Hosting = (typeof HOSTINGS)[number];

export const AUDIT_STATUSES = [
  'queued',
  'running',
  'partial',
  'done',
  'failed',
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const AUDIT_TRIGGERS = ['manual', 'schedule'] as const;
export type AuditTrigger = (typeof AUDIT_TRIGGERS)[number];

export const AUDIT_MODES = ['passive', 'active'] as const;
export type AuditMode = (typeof AUDIT_MODES)[number];

export const FINDING_STATUSES = [
  'pass',
  'warn',
  'fail',
  'untested',
  'na',
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const REPORT_VISIBILITIES = ['private', 'link', 'public'] as const;
export type ReportVisibility = (typeof REPORT_VISIBILITIES)[number];

export const VERIFICATION_METHODS = ['dns_txt', 'file', 'meta'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const VERIFICATION_STATUSES = [
  'pending',
  'verified',
  'failed',
  'expired',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ARTIFACT_KINDS = [
  'json',
  'pdf',
  'screenshot',
  'warc',
  'tsr',
  'sig',
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const DOMAINS = [
  'performance',
  'seo',
  'securite',
  'ecologie',
  'accessibilite',
  'qualite',
  'vie_privee',
  'dns_email',
  'reputation',
  'disponibilite',
] as const;
export type Domain = (typeof DOMAINS)[number];
