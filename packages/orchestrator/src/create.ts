import type { RequestAuditInput, RequestAuditResult } from '@audigy/db';
import { ENGINE_VERSION, METHOD_VERSION } from '@audigy/engine';
import { errorCode, type Logger } from './log.js';
import {
  type CreateAuditInput,
  InvalidSiteUrl,
  normalizeSiteUrl,
  type SiteInput,
} from './target.js';

export interface CreateDeps {
  /** Site de l'utilisateur pour cette adresse, créé s'il manque (sous RLS). */
  ensureSite(site: SiteInput): Promise<string>;
  requestAudit(input: RequestAuditInput): Promise<RequestAuditResult>;
  /** Réveille `audit-run-background`. Un échec n'annule pas l'audit (il reste en file). */
  trigger(): Promise<void>;
  allowLab: boolean;
  logger: Logger;
}

export type CreateResult =
  | { kind: 'created' | 'existing'; auditId: string }
  | { kind: 'host_limit' | 'user_limit'; retryAfter: number }
  | { kind: 'site_not_found' | 'unverified' | 'invalid_url' };

export async function createAudit(
  deps: CreateDeps,
  userId: string,
  input: CreateAuditInput,
): Promise<CreateResult> {
  let siteId: string;
  if (input.siteId !== undefined) {
    siteId = input.siteId;
  } else {
    let site: SiteInput;
    try {
      site = normalizeSiteUrl(input.url ?? '', { allowLab: deps.allowLab });
    } catch (error) {
      if (error instanceof InvalidSiteUrl) return { kind: 'invalid_url' };
      throw error;
    }
    siteId = await deps.ensureSite(site);
  }

  const res = await deps.requestAudit({
    userId,
    siteId,
    mode: input.mode,
    trigger: 'manual',
    methodVersion: METHOD_VERSION,
    engineVersion: ENGINE_VERSION,
  });

  switch (res.outcome) {
    case 'created':
    case 'existing': {
      const auditId = res.auditId as string;
      deps.logger.info('audit_requested', { auditId, outcome: res.outcome });
      if (res.outcome === 'created') {
        try {
          await deps.trigger();
        } catch (error) {
          deps.logger.warn('audit_trigger_failed', {
            auditId,
            code: errorCode(error),
          });
        }
      }
      return { kind: res.outcome, auditId };
    }
    case 'host_limit':
    case 'user_limit':
      deps.logger.info('audit_rate_limited', { scope: res.outcome });
      return { kind: res.outcome, retryAfter: res.retryAfterSeconds ?? 60 };
    default:
      return { kind: res.outcome };
  }
}
