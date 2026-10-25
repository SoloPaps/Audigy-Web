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

/** Fourchette grossière, pas un minuteur. */
export function progressEta(status: string, scored: number): string | null {
  if (status === 'done' || status === 'failed') return null;
  if (status === 'partial' || scored >= 4) return t('progress.eta.short');
  if (scored >= 1) return t('progress.eta.mid');
  return t('progress.eta.long');
}

/** Phase nommée : file, DNS, pages, vie privée, fin. */
export function progressPhase(
  status: string,
  scored: number,
  privacyScored: boolean,
): string | null {
  if (status === 'done' || status === 'failed') return null;
  if (status === 'queued') return t('progress.phase.queue');
  if (privacyScored) return t('progress.phase.tail');
  if (scored === 0) return t('progress.phase.dns');
  if (scored < 4) return t('progress.phase.pages');
  return t('progress.phase.privacy');
}
