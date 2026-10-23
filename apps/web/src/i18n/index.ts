import { fr, type MessageKey } from './fr.js';

export type { MessageKey };

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = fr[key];
  if (!params) return text;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
