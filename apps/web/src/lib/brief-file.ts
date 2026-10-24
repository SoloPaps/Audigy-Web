import { t } from '../i18n/index.js';

export function exportHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLocaleLowerCase('fr-FR');
    if (/^[a-z0-9.-]+$/u.test(host) && !host.startsWith('.')) return host;
  } catch {
    // adresse illisible
  }
  return 'site';
}

export function parisCivilDay(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function briefFilename(url: string, at: Date): string {
  return `audigy-brief-${exportHost(url)}-${parisCivilDay(at)}.md`;
}

export function briefFileBody(brief: string): string {
  const core = brief.replace(/\n$/u, '');
  return `${core}\n${t('brief.notProof')}\n`;
}

export function downloadTextFile(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
