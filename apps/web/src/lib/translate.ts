import { fr, type MessageKey } from '../i18n/index.js';
import { packLine } from '../i18n/pack.js';
import { reportLine } from '../i18n/report-fr.js';

function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(fr, key);
}

/** Traduit une clé venue de l’API. `null` si la clé ou un paramètre manque. */
export function translate(
  key: string,
  params?: Record<string, string | number> | null,
): string | null {
  const template =
    packLine(key) ?? (isMessageKey(key) ? fr[key] : reportLine(key));
  if (template === null) return null;
  const names = [...template.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(
    (match) => match[1] ?? '',
  );
  if (names.length === 0) return template;
  const filled = new Map<string, string>();
  for (const name of names) {
    const value = params?.[name];
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    filled.set(name, String(value));
  }
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_raw, name: string) => {
    return filled.get(name) ?? '';
  });
}

export function asParams(
  value: unknown,
): Record<string, string | number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'number') out[key] = item;
  }
  return out;
}
