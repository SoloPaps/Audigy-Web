import { parseArgs } from 'node:util';
import type { Check, FixSheet, RunContext } from '@audigy/engine';
import { createRequestBudget } from '@audigy/net';
import {
  assemble,
  browserPlaceholders,
  createAuditContext,
  defaultChecks,
  InvalidSiteUrl,
  type LabConfig,
  labFromEnv,
  labNet,
  normalizeSiteUrl,
  ORCHESTRATION_REASONS,
  runBrowserPhase,
  runServerPhase,
  type SiteInput,
  splitChecks,
  targetOf,
} from '@audigy/orchestrator';
import { t } from '@audigy/web/i18n';
import { type BrowserState, renderText } from './text.js';

/**
 * Runner navigateur local : renvoie le rapport lu par les checks `needs: ['browser']`.
 * `lab` : connexions redirigées vers le labo, comme pour les checks serveur.
 */
export type BrowserRunner = (input: {
  url: string;
  lab: LabConfig | null;
}) => Promise<unknown>;

export interface CliIo {
  stdout(line: string): void;
  stderr(line: string): void;
  env: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface CliDeps {
  checks?: readonly Check[];
  fixes?: ReadonlyMap<string, FixSheet>;
  loadBrowserRunner?: () => Promise<BrowserRunner | null>;
  /** Tests : réseau et budget remplacés. */
  net?: Partial<RunContext['net']>;
  perHostIntervalMs?: number;
}

/** Chromium via `@audigy/browser-runner` (Playwright chargé seulement avec `--browser`). */
async function defaultBrowserRunner(): Promise<BrowserRunner> {
  const { BROWSER_BUDGET, runBrowserAudit } = await import(
    '@audigy/browser-runner'
  );
  return async ({ url, lab }) => {
    const fetch = lab
      ? labNet(lab, createRequestBudget(BROWSER_BUDGET)).fetch
      : undefined;
    const output = await runBrowserAudit({ url, ...(fetch ? { fetch } : {}) });
    return output.result;
  };
}

/** `audigy audit <url> [--json] [--browser]`. Code de sortie : 0 fini, 1 échec, 2 usage. */
export async function runCli(
  argv: readonly string[],
  io: CliIo,
  deps: CliDeps = {},
): Promise<number> {
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(argv);
  } catch {
    io.stderr(t('cli.usage'));
    return 2;
  }
  const [command, rawUrl] = parsed.positionals;
  if (parsed.values.help) {
    io.stdout(t('cli.usage'));
    return 0;
  }
  if (command !== 'audit' || rawUrl === undefined) {
    if (command !== undefined && command !== 'audit')
      io.stderr(t('cli.error.command'));
    io.stderr(t('cli.usage'));
    return 2;
  }

  const lab = labFromEnv(io.env, {
    requireNetlifyDev: false,
    ...(io.cwd ? { cwd: io.cwd } : {}),
  });
  let site: SiteInput;
  try {
    site = normalizeSiteUrl(rawUrl, { allowLab: lab !== null });
  } catch (error) {
    if (!(error instanceof InvalidSiteUrl)) throw error;
    io.stderr(t('cli.error.url'));
    return 2;
  }

  try {
    const target = targetOf(site);
    const { ctx, available } = createAuditContext({
      target,
      verified: false,
      env: io.env,
      lab,
      ...(deps.net ? { net: deps.net } : {}),
      ...(deps.perHostIntervalMs !== undefined
        ? { budget: { perHostIntervalMs: deps.perHostIntervalMs } }
        : {}),
    });
    const { server, browser } = splitChecks(
      deps.checks ?? defaultChecks(io.env),
    );
    const serverOutcomes = await runServerPhase(server, ctx, { available });

    let state: BrowserState = 'none';
    let browserOutcomes = browserPlaceholders(
      browser,
      ORCHESTRATION_REASONS.browserSkipped,
    );
    if (browser.length > 0) state = 'skipped';
    if (browser.length > 0 && parsed.values.browser) {
      let data: unknown = null;
      try {
        const runner = await (deps.loadBrowserRunner ?? defaultBrowserRunner)();
        if (runner) data = await runner({ url: target.url.href, lab });
      } catch {
        data = null;
      }
      if (data === null || data === undefined) {
        state = 'absent';
        browserOutcomes = browserPlaceholders(
          browser,
          ORCHESTRATION_REASONS.runnerAbsent,
        );
      } else {
        state = 'merged';
        browserOutcomes = await runBrowserPhase(browser, ctx, data, {
          available,
        });
      }
    }

    const summary = assemble(
      [...serverOutcomes, ...browserOutcomes],
      deps.fixes ?? new Map(),
    );
    if (parsed.values.json) {
      io.stdout(
        JSON.stringify(
          {
            url: target.url.href,
            methodVersion: summary.methodVersion,
            engineVersion: summary.engineVersion,
            browser: state,
            global: summary.global,
            domains: summary.domains,
            priorities: summary.priorities,
            findings: summary.outcomes,
          },
          null,
          2,
        ),
      );
    } else {
      for (const line of renderText(target.url.href, summary, state))
        io.stdout(line);
    }
    return 0;
  } catch {
    io.stderr(t('cli.error.failed'));
    return 1;
  }
}

function parse(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      json: { type: 'boolean', default: false },
      browser: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
}
