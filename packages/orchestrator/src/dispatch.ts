import type { Logger } from './log.js';

/** Workflow du runner navigateur (PART-13), déclenché à la main (`workflow_dispatch`). */
export const BROWSER_WORKFLOW = {
  owner: 'SoloPaps',
  repo: 'Audigy-Web',
  workflow: 'browser-audit.yml',
  ref: 'main',
} as const;

export type DispatchResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'rejected' | 'network' };

export interface Dispatcher {
  dispatch(auditId: string): Promise<DispatchResult>;
}

export interface GithubDispatcherOptions {
  /** `GH_DISPATCH_TOKEN` (fine-grained, `actions:write` sur ce dépôt seul). */
  token: string | undefined;
  logger: Logger;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  workflow?: typeof BROWSER_WORKFLOW;
}

/**
 * Appel à l'API GitHub (pas un site audité : `safeFetch` ne s'applique pas).
 * Sans jeton : `not_configured`, aucun appel. Le jeton n'est jamais journalisé.
 */
export function createGithubDispatcher(
  options: GithubDispatcherOptions,
): Dispatcher {
  const doFetch = options.fetch ?? globalThis.fetch;
  const wf = options.workflow ?? BROWSER_WORKFLOW;
  const token = options.token?.trim();
  return {
    async dispatch(auditId) {
      if (!token) {
        options.logger.info('runner_dispatch_skipped', {
          auditId,
          reason: 'not_configured',
        });
        return { ok: false, reason: 'not_configured' };
      }
      const url = `https://api.github.com/repos/${wf.owner}/${wf.repo}/actions/workflows/${wf.workflow}/dispatches`;
      try {
        const res = await doFetch(url, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
          headers: {
            accept: 'application/vnd.github+json',
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            'x-github-api-version': '2022-11-28',
            'user-agent': 'Audigy',
          },
          body: JSON.stringify({ ref: wf.ref, inputs: { auditId } }),
        });
        await res.body?.cancel();
        if (res.status === 204) {
          options.logger.info('runner_dispatched', { auditId });
          return { ok: true };
        }
        options.logger.warn('runner_dispatch_rejected', {
          auditId,
          status: res.status,
        });
        return { ok: false, reason: 'rejected' };
      } catch {
        options.logger.warn('runner_dispatch_failed', { auditId });
        return { ok: false, reason: 'network' };
      }
    },
  };
}

/** Variable de dev (hors §9), lue seulement avec le labo sous `netlify dev`. */
export const LOCAL_RUNNER_ENV_NAME = 'AUDIGY_LOCAL_RUNNER';

/** Labo : le runner est lancé à la main en local ; la fonction l'attend sans appeler GitHub. */
export function createLocalDispatcher(logger: Logger): Dispatcher {
  return {
    async dispatch(auditId) {
      logger.info('runner_dispatch_local', { auditId });
      return { ok: true };
    },
  };
}
