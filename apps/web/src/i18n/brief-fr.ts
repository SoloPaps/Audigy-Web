/**
 * Fragments du brief. Hors du dictionnaire commun : l’accueil ne les charge pas.
 */
export const briefFr = {
  'brief.h.role': 'Rôle',
  'brief.h.context': 'Contexte du site',
  'brief.h.findings': 'Constats',
  'brief.h.catalog': 'Référentiel',
  'brief.h.expected': 'Attendu',
  'brief.h.guards': 'Garde-fous',
  'brief.h.terminal': 'Terminal',
  'brief.role.fix': 'Vous corrigez le site {url} d’après un audit Audigy.',
  'brief.role.dev': 'Vous êtes le développeur web de ce site.',
  'brief.context.url': 'Adresse : {url}.',
  'brief.context.stack': 'Technique reconnue : {stack}.',
  'brief.context.nostack':
    'Technique non reconnue : demandez-la, ne la devinez pas.',
  'brief.context.hosting': 'Hébergement reconnu : {hosting}.',
  'brief.context.date': 'Audit du {date}.',
  'brief.finding.status': 'Statut : {label}.',
  'brief.finding.proof': 'Preuve : {proof}.',
  'brief.finding.impact': 'Pour la personne : {impact}.',
  'brief.finding.steps': 'Pistes de la fiche Audigy :',
  'brief.finding.code': 'Exemple de configuration :',
  'brief.ref.id': 'Test : {id}.',
  'brief.ref.criterion': 'Critère : {criterion}.',
  'brief.ref.pass': 'Réussi veut dire : {pass}.',
  'brief.ref.source': 'Référence déjà notée : {citation}.',
  'brief.expected.diff': 'Proposez un diff, un fichier ou une configuration.',
  'brief.expected.stack': 'N’inventez pas la technique du site.',
  'brief.expected.verify': 'Pour chaque correction, dites comment la vérifier.',
  'brief.expected.score': 'N’inventez pas de note.',
  'brief.guard.secret': 'Ne recopiez aucun secret.',
  'brief.guard.prod': 'Ne changez pas la production sans demander.',
  'brief.guard.scope': 'Restez dans les constats de ce brief.',
  'brief.guard.ask': 'Si une information manque, demandez avant d’agir.',
  'brief.guard.attack':
    'Pas de procédure d’attaque, de charge utile, ni de contournement.',
  'brief.terminal.absent': 'Si l’outil n’est pas là, passez.',
  'brief.terminal.origin': 'Ces commandes ne partent pas d’Audigy.',
  'brief.terminal.ban': 'N’utilisez pas rm, ni un push forcé.',
  'brief.terminal.active': 'Ne lancez pas de test actif.',
  'brief.terminal.headers': 'Lisez les en-têtes de la réponse. N’écrivez rien.',
  'brief.terminal.cert': 'Lisez le certificat public. N’écrivez rien.',
  'brief.terminal.dns': 'Lisez le DNS public. N’écrivez aucun enregistrement.',
  'brief.terminal.lh':
    'Lancez Lighthouse en ligne de commande si l’outil est là.',
  'brief.terminal.fixSuggest':
    'Proposez un fichier, une configuration, ou une commande qui ne détruit rien.',
  'brief.terminal.guess': 'S’il faut deviner la technique, demandez.',
  'brief.terminal.fixWrite': 'N’appliquez rien sans qu’on vous le demande.',
  'brief.count.one': '1 sélectionné',
  'brief.count.many': '{n} sélectionnés',
  'brief.allFails': 'Tous les échecs',
  'brief.generate': 'Générer le brief',
  'brief.generate.hint': 'Cochez un constat, ou prenez tous les échecs.',
  'brief.none': 'Aucun constat à corriger',
  'brief.untested': 'Non testé — pas de brief',
  'brief.copy': 'Copier',
  'brief.copied': 'Brief copié',
  'brief.copyFail': 'La copie a échoué. Sélectionnez le texte.',
  'brief.regenerate': 'Régénérer',
  'brief.download': 'Télécharger en Markdown',
  'brief.collapse': 'Réduire',
  'brief.show': 'Afficher le brief',
  'brief.live': 'Brief généré, {n} constats',
  'brief.include': 'Inclure {title}',
  'brief.panel': 'Texte du brief',
  'brief.terminal.group': 'Commande pour {title}',
  'brief.terminal.rien': 'Rien',
  'brief.terminal.rien.long': 'Pas de commande',
  'brief.terminal.verif': 'Vérif',
  'brief.terminal.verif.long': 'Vérifier, sans écrire',
  'brief.terminal.fix': 'Fix',
  'brief.terminal.fix.long': 'Proposer une correction',
  'brief.notProof': 'Ce fichier n’est pas une preuve.',
} as const satisfies Record<string, string>;

type BriefKey = keyof typeof briefFr;

type ParamNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | ParamNames<Rest>
    : never;

type ParamsOf<K extends BriefKey> = {
  readonly [P in ParamNames<(typeof briefFr)[K]> & string]: string | number;
};

type ArgsFor<K extends BriefKey> = K extends unknown
  ? ParamNames<(typeof briefFr)[K]> extends never
    ? []
    : [params: ParamsOf<K>]
  : never;

/** Même contrat que `t`, limité aux fragments du brief. */
export function t<K extends BriefKey>(key: K, ...args: ArgsFor<K>): string {
  const template: string = briefFr[key];
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
