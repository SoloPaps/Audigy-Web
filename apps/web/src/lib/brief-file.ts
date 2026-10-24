import { t } from '../i18n/brief-fr.js';
import { exportHost, parisCivilDay, saveTextFile } from './report-export.js';

export { exportHost, parisCivilDay };

export function briefFilename(url: string, at: Date): string {
  return `audigy-brief-${exportHost(url)}-${parisCivilDay(at)}.md`;
}

export function briefFileBody(brief: string): string {
  const core = brief.replace(/\n$/u, '');
  return `${core}\n${t('brief.notProof')}\n`;
}

export function downloadTextFile(filename: string, body: string): void {
  saveTextFile(filename, body);
}
