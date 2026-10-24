import { MAIN_DOMAINS } from '@audigy/engine';
import type { AuditSummary } from '@audigy/orchestrator';
import { fr, type MessageKey, t } from '@audigy/web/i18n';

/** Traduit une clé venue du moteur. Clé inconnue : la clé elle-même. */
export function translate(
  key: string,
  params: Readonly<Record<string, string | number>> = {},
): string {
  if (!Object.hasOwn(fr, key)) return key;
  const template: string = fr[key as MessageKey];
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (raw, name: string) => {
    const value = params[name];
    return value === undefined ? raw : String(value);
  });
}

function levelSentence(level: string): string {
  return translate(`level.${level}.sentence`);
}

export type BrowserState = 'none' | 'merged' | 'skipped' | 'absent';

/** Rapport texte, en français, à partir des clés `fr`. */
export function renderText(
  url: string,
  summary: AuditSummary,
  browser: BrowserState,
): string[] {
  const lines: string[] = [
    t('cli.title', { url }),
    t('cli.versions', {
      method: summary.methodVersion,
      engine: summary.engineVersion,
    }),
    '',
  ];
  const { global } = summary;
  lines.push(
    global.score === null
      ? t('cli.global_untested')
      : t('cli.global', {
          score: global.score,
          level: levelSentence(global.level),
          scored: global.scoredDomains.length,
        }),
    '',
    t('cli.domains'),
  );
  for (const domain of MAIN_DOMAINS) {
    const score = summary.domains.find((d) => d.domain === domain);
    const name = translate(`domain.${domain}.tech`);
    lines.push(
      score?.score === null || score === undefined
        ? `- ${t('cli.domain_untested', { domain: name })}`
        : `- ${t('cli.domain', {
            domain: name,
            score: score.score,
            level: levelSentence(score.level),
          })}`,
    );
  }

  const byId = new Map(summary.outcomes.map((o) => [o.checkId, o]));
  lines.push('', t('cli.priorities'));
  if (summary.priorities.length === 0) lines.push(t('cli.priorities_none'));
  summary.priorities.forEach((id, index) => {
    const outcome = byId.get(id);
    if (!outcome) return;
    lines.push(
      `${index + 1}. ${translate(outcome.result.messageKey, outcome.result.params)} (${id})`,
    );
  });

  const untested = summary.outcomes.filter(
    (o) => o.result.status === 'untested',
  );
  if (untested.length > 0) {
    lines.push('', t('cli.untested', { count: untested.length }));
    for (const o of untested) {
      const key = o.result.reason ?? o.result.messageKey;
      lines.push(`- ${o.checkId} : ${translate(key, o.result.params)}`);
    }
  }
  if (browser === 'skipped') lines.push('', t('cli.browser.skipped'));
  if (browser === 'absent') lines.push('', t('cli.browser.absent'));
  return lines;
}
