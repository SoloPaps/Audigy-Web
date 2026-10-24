import type { AuditResultsInput } from '@audigy/db';
import type { Check, CheckOutcome, FixSheet, Target } from '@audigy/engine';
import type { AuditContext } from './context.js';
import type { Dispatcher } from './dispatch.js';
import { errorCode, type Logger } from './log.js';
import {
  type AuditSummary,
  assemble,
  type BrowserReason,
  browserPlaceholders,
  domainScoreRows,
  findingRows,
  ORCHESTRATION_REASONS,
  runBrowserPhase,
  runServerPhase,
  splitChecks,
} from './pipeline.js';
import { targetOf } from './target.js';

/** Netlify background : 15 min. On garde une marge pour l'écriture finale. */
export const BACKGROUND_BUDGET_MS = 14 * 60_000;
/** Attente maximale du runner navigateur après le déclenchement. */
export const RUNNER_WAIT_MS = 10 * 60_000;
export const RUNNER_POLL_MS = 15_000;
/** Un audit `running` ou `partial` plus vieux que ceci a perdu sa fonction. */
export const STALE_AFTER_MINUTES = 20;

export interface ClaimedAudit {
  id: string;
  siteId: string;
  mode: 'passive' | 'active';
  site: { url: string; scope: string; hosting: string };
}

export interface AuditStore {
  failStale(olderThanMinutes: number): Promise<number>;
  claimNext(): Promise<ClaimedAudit | null>;
  /** Vérification de propriété `verified` revérifiée il y a moins de 10 min. */
  isVerifiedFresh(siteId: string): Promise<boolean>;
  /** Journal `audit_log`. Absent des anciens tests. */
  appendAudit?(entry: {
    actor: string | null;
    action: string;
    target: string | null;
    details: Record<string, string | number | boolean | null>;
  }): Promise<void>;
  writeResults(input: AuditResultsInput): Promise<void>;
  /** Sortie validée du runner navigateur, ou `null` si elle n'est pas encore là. */
  readRunnerOutput(auditId: string): Promise<unknown | null>;
}

export interface ProcessDeps {
  store: AuditStore;
  dispatcher: Dispatcher;
  checks: readonly Check[];
  fixes: ReadonlyMap<string, FixSheet>;
  context(target: Target, verified: boolean): AuditContext;
  /**
   * Relit la preuve avant un audit actif. Absent : repli sur `isVerifiedFresh`.
   */
  confirmActive?(
    audit: ClaimedAudit,
  ): Promise<{ allowed: boolean; actor: string | null }>;
  logger: Logger;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  runnerWaitMs?: number;
  pollMs?: number;
  budgetMs?: number;
}

export interface ProcessResult {
  auditId: string;
  status: 'done' | 'failed';
  runner: 'none' | 'merged' | BrowserReason;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function resultsInput(
  auditId: string,
  status: AuditResultsInput['status'],
  summary: AuditSummary | null,
  fixes: ReadonlyMap<string, FixSheet>,
  error: string | null = null,
): AuditResultsInput {
  return {
    auditId,
    status,
    globalScore: summary?.global.score ?? null,
    coverage: summary?.global.coverage ?? null,
    domainScores: summary ? domainScoreRows(summary) : [],
    findings: summary ? findingRows(summary, fixes) : [],
    error,
  };
}

/**
 * Traite l'audit suivant de la file : claim → checks côté fonction → écriture `partial`
 * → déclenchement du runner → attente bornée → fusion → score → écriture `done`.
 * Runner absent, refusé ou trop lent : checks navigateur `untested`
 * (`reason.runner_absent`), l'audit finit quand même en `done`.
 */
export async function processNextAudit(
  deps: ProcessDeps,
): Promise<ProcessResult | null> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const invokedAt = now();
  const log = deps.logger;

  const stale = await deps.store.failStale(STALE_AFTER_MINUTES);
  if (stale > 0) log.warn('audits_stale', { count: stale });

  const audit = await deps.store.claimNext();
  if (!audit) return null;
  log.info('audit_claimed', { auditId: audit.id, mode: audit.mode });

  let summary: AuditSummary | null = null;
  try {
    let verified = false;
    let actor: string | null = null;
    if (audit.mode === 'active') {
      if (deps.confirmActive) {
        const decision = await deps.confirmActive(audit);
        verified = decision.allowed;
        actor = decision.actor;
      } else {
        verified = await deps.store.isVerifiedFresh(audit.siteId);
      }
    }
    const { ctx, available } = deps.context(targetOf(audit.site), verified);
    const { server, browser } = splitChecks(deps.checks);

    const serverOutcomes = await runServerPhase(server, ctx, { available });
    if (audit.mode === 'active' && deps.store.appendAudit) {
      for (const outcome of serverOutcomes) {
        if (outcome.mode !== 'active') continue;
        await deps.store.appendAudit({
          actor,
          action: 'active.check',
          target: audit.siteId,
          details: {
            auditId: audit.id,
            checkId: outcome.checkId,
            status: outcome.result.status,
          },
        });
      }
    }
    summary = assemble(
      [
        ...serverOutcomes,
        ...browserPlaceholders(browser, ORCHESTRATION_REASONS.runnerPending),
      ],
      deps.fixes,
    );
    await deps.store.writeResults(
      resultsInput(audit.id, 'partial', summary, deps.fixes),
    );
    log.info('audit_partial', { auditId: audit.id });

    let browserOutcomes: CheckOutcome[] = [];
    let runner: ProcessResult['runner'] = 'none';
    if (browser.length > 0) {
      const dispatched = await deps.dispatcher.dispatch(audit.id);
      let data: unknown | null = null;
      if (dispatched.ok) {
        const deadline = Math.min(
          now() + (deps.runnerWaitMs ?? RUNNER_WAIT_MS),
          invokedAt + (deps.budgetMs ?? BACKGROUND_BUDGET_MS),
        );
        const poll = deps.pollMs ?? RUNNER_POLL_MS;
        for (;;) {
          data = await deps.store.readRunnerOutput(audit.id);
          if (data !== null || now() + poll > deadline) break;
          await sleep(poll);
        }
      }
      if (data === null) {
        runner = ORCHESTRATION_REASONS.runnerAbsent;
        browserOutcomes = browserPlaceholders(browser, runner);
        log.warn('runner_absent', {
          auditId: audit.id,
          dispatched: dispatched.ok,
        });
      } else {
        runner = 'merged';
        browserOutcomes = await runBrowserPhase(browser, ctx, data, {
          available,
        });
      }
    }

    summary = assemble([...serverOutcomes, ...browserOutcomes], deps.fixes);
    await deps.store.writeResults(
      resultsInput(audit.id, 'done', summary, deps.fixes),
    );
    log.info('audit_done', {
      auditId: audit.id,
      requests: ctx.budget.requests,
      runner,
    });
    return { auditId: audit.id, status: 'done', runner };
  } catch (error) {
    log.error('audit_failed', { auditId: audit.id, code: errorCode(error) });
    try {
      await deps.store.writeResults(
        resultsInput(audit.id, 'failed', summary, deps.fixes, 'engine_error'),
      );
    } catch (writeError) {
      log.error('audit_write_failed', {
        auditId: audit.id,
        code: errorCode(writeError),
      });
    }
    return { auditId: audit.id, status: 'failed', runner: 'none' };
  }
}
