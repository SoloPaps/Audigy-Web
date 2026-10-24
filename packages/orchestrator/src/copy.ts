/**
 * Textes des e-mails (fr). Même contrat que `t()` de l’app :
 * une clé inconnue est refusée à la compilation.
 * Le linter de texte lit ce fichier.
 */

const fr = {
  'mail.alert.down.subject': 'Votre site ne répond plus',
  'mail.alert.down.body': '{site} n’a pas répondu deux fois de suite.',
  'mail.alert.down.action': 'Vérifiez que le site est en ligne.',
  'mail.alert.up.subject': 'Votre site répond de nouveau',
  'mail.alert.up.body': '{site} répond à nouveau.',
  'mail.alert.up.done': 'L’incident est terminé.',
  'mail.alert.score.subject': 'La note de votre site a baissé',
  'mail.alert.score.body': 'La note de {site} passe de {avant} à {apres}.',
  'mail.alert.score.drop': 'La baisse est d’au moins 10 points.',
  'mail.alert.grave.subject': 'Un problème grave est apparu',
  'mail.alert.grave.one': '{site} a un nouveau problème grave.',
  'mail.alert.grave.many': '{site} a {count} nouveaux problèmes graves.',
  'mail.alert.cert.soon.subject': 'Le certificat expire bientôt',
  'mail.alert.cert.today': 'Le certificat de {site} expire aujourd’hui.',
  'mail.alert.cert.one': 'Le certificat de {site} expire dans un jour.',
  'mail.alert.cert.many': 'Le certificat de {site} expire dans {jours} jours.',
  'mail.alert.cert.action': 'Renouvelez-le avant la coupure.',
  'mail.alert.cert.expired.subject': 'Le certificat est périmé',
  'mail.alert.cert.expired.body': 'Le certificat de {site} est périmé.',
  'mail.alert.cert.expired.action': 'Renouvelez-le pour rétablir le cadenas.',
  'mail.digest.subject': 'Votre résumé de la semaine',
  'mail.digest.intro': 'Voici l’état de vos sites pour la semaine.',
  'mail.digest.line': '{site} : note {score}, disponibilité {uptime}.',
  'mail.digest.incident': 'Un incident est en cours.',
  'mail.digest.score.none': 'pas encore de note',
  'mail.digest.uptime.none': 'pas encore mesurée',
  'mail.digest.uptime.pct': '{pct} %',
  'mail.digest.footer': 'Vous recevez ce résumé chaque lundi.',
  'mail.digest.unsub':
    'Pour ne plus le recevoir, utilisez le lien de désabonnement.',
  'mail.link.open': 'Ouvrir Audigy',
  'mail.link.unsubscribe': 'Me désabonner',
  'mail.unsub.title': 'Désabonnement',
  'mail.unsub.prompt': 'Confirmez pour ne plus recevoir les messages.',
  'mail.unsub.button': 'Me désabonner',
  'mail.unsub.done':
    'C’est fait. Vous ne recevrez plus les alertes ni le résumé.',
  'mail.unsub.invalid': 'Ce lien n’est pas valable.',
} as const;

export type MailKey = keyof typeof fr;

type ParamNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamsOf<K extends MailKey> = {
  readonly [P in ParamNames<(typeof fr)[K]> & string]: string | number;
};

type ArgsFor<K extends MailKey> = K extends unknown
  ? ParamNames<(typeof fr)[K]> extends never
    ? []
    : [params: ParamsOf<K>]
  : never;

/** Traduit une clé du dictionnaire e-mail. */
export function t<K extends MailKey>(key: K, ...args: ArgsFor<K>): string {
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
