import { t } from '../i18n/index.js';

export function progressLive(
  status: string,
  finishedNames: readonly string[],
): string {
  if (status === 'done') return t('progress.ready');
  if (status === 'failed') return t('progress.failed');
  if (status === 'partial') return t('progress.partial');
  const last = finishedNames[finishedNames.length - 1];
  if (last) return last;
  return t('progress.live');
}

/** Phrase visible quand les checks navigateur n’ont pas tourné. */
export function runnerGap(
  findings: readonly { reason: string | null }[],
): string | null {
  if (findings.some((item) => item.reason === 'reason.runner_absent')) {
    return t('reason.runner_absent');
  }
  if (findings.some((item) => item.reason === 'reason.browser_skipped')) {
    return t('reason.browser_skipped');
  }
  return null;
}
