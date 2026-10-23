import { fr, type MessageKey } from './fr.js';

export { formatDate, formatDuration, formatNumber } from './format.js';
export { fr, type MessageKey };

type ParamNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamsOf<K extends MessageKey> = {
  readonly [P in ParamNames<(typeof fr)[K]> & string]: string | number;
};

type ArgsFor<K extends MessageKey> = K extends unknown
  ? ParamNames<(typeof fr)[K]> extends never
    ? []
    : [params: ParamsOf<K>]
  : never;

/**
 * Traduit une clé du dictionnaire `fr`.
 * Une clé inconnue est refusée par le compilateur.
 * Une clé littérale à paramètres exige ces paramètres.
 */
export function t<K extends MessageKey>(key: K, ...args: ArgsFor<K>): string {
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
