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
