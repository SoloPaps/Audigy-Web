import { fr, type MessageKey } from './fr.js';

export { formatDate, formatDuration, formatNumber } from './format.js';
export { fr, type MessageKey };

type ParamNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamsFor<K extends MessageKey> =
  ParamNames<(typeof fr)[K]> extends never
    ? undefined
    : { readonly [P in ParamNames<(typeof fr)[K]>]: string | number };

/**
 * Traduit une clé du dictionnaire `fr`.
 * Une clé inconnue est refusée par le compilateur.
 */
export function t<K extends MessageKey>(
  key: K,
  ...args: ParamsFor<K> extends undefined ? [] : [params: ParamsFor<K>]
): string {
  const template: string = fr[key];
  const params = args[0] as
    | Readonly<Record<string, string | number>>
    | undefined;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_raw, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`paramètre manquant : ${name}`);
    }
    return String(value);
  });
}
