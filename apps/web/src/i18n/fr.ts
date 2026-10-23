/**
 * Dictionnaire français. Une clé absente de cet objet
 * ne peut pas être passée à `t()` (erreur de typage).
 */
export const fr = {
  'skip.content': 'Aller au contenu',
  'brand.name': 'Audigy',
  'meta.home.title': 'Audigy',
  'meta.home.description':
    'Audigy audite un site et explique quoi corriger, en français simple.',
  'meta.demo.title': 'Rapport d’exemple — Audigy',
  'meta.demo.description': 'Exemple de rapport Audigy, absent du site publié.',
  'theme.label': 'Thème',
  'theme.system': 'Système',
  'theme.light': 'Clair',
  'theme.dark': 'Sombre',
  'home.title': 'Audigy',
  'home.headline': 'Vérifiez la santé de votre site, gratuitement.',
  'home.submit': "Lancer l'audit",
  'home.lead':
    'Audigy audite un site et explique quoi corriger, en français simple.',
  'home.next': 'Le formulaire d’audit n’est pas encore en place.',
  'footer.note': 'Outil gratuit. Aucun traceur. Polices hébergées ici.',
  'level.good': 'Bon',
  'level.improve': 'À améliorer',
  'level.problem': 'Problème',
  'level.untested': 'Non testé',
  'level.good.sentence': 'bon',
  'level.improve.sentence': 'à améliorer',
  'level.problem.sentence': 'problème',
  'level.untested.sentence': 'non testé',
  'status.pass': 'Réussi',
  'status.warn': 'À améliorer',
  'status.fail': 'Problème',
  'status.untested': 'Non testé',
  'status.na': 'Non applicable',
  'gauge.score': '{domain} : {score} sur 100, {level}',
  'gauge.untested': '{domain} : {level}',
  'gauge.denom': '/100',
  'gauge.sample.zero': 'Note de zéro',
  'gauge.sample.full': 'Note pleine',
  'gauge.sample.empty': 'Note absente',
  'score.empty': '—',
  'verdict.good': 'Votre site est en bonne santé.',
  'verdict.improve': 'Votre site peut mieux faire.',
  'verdict.problem': 'Votre site a des problèmes importants.',
  'verdict.untested': 'Nous n’avons pas assez de mesures.',
  'verdict.fixes.none': 'Rien à corriger pour l’instant.',
  'verdict.fixes.one.urgent': '1 point à corriger, dont 1 urgent.',
  'verdict.fixes.one.calm': '1 point à corriger, sans urgence.',
  'verdict.fixes.many.one': '{count} points à corriger, dont 1 urgent.',
  'verdict.fixes.many.many':
    '{count} points à corriger, dont {urgent} urgents.',
  'verdict.fixes.many.calm': '{count} points à corriger, sans urgence.',
  'verdict.skipped.one': '1 point n’a pas pu être testé.',
  'verdict.skipped.many': '{count} points n’ont pas pu être testés.',
  'verdict.actions': 'À traiter d’abord',
  'domain.global': 'Score global',
  'domain.performance.plain': 'Vitesse',
  'domain.performance.tech': 'Performance',
  'domain.performance.detail': 'Votre site s’affiche en 1,8 s sur mobile.',
  'domain.seo.plain': 'Visibilité sur Google',
  'domain.seo.tech': 'Référencement',
  'domain.seo.detail': 'Vos pages sont faciles à trouver sur Google.',
  'domain.securite.plain': 'Protection',
  'domain.securite.tech': 'Sécurité',
  'domain.securite.detail': 'Des pages s’ouvrent encore sans adresse chiffrée.',
  'domain.ecologie.plain': 'Impact écologique',
  'domain.ecologie.tech': 'Écologie',
  'domain.ecologie.detail': 'La page reste légère à charger.',
  'domain.accessibilite.plain': 'Accès pour tous',
  'domain.accessibilite.tech': 'Accessibilité',
  'domain.accessibilite.detail': 'La page se lit au clavier et à l’écran.',
  'domain.qualite.plain': 'Solidité',
  'domain.qualite.tech': 'Qualité technique',
  'domain.qualite.detail': 'La base technique ne montre pas d’erreur.',
  'domain.vie_privee.plain': 'Vie privée',
  'domain.vie_privee.tech': 'Données personnelles',
  'domain.vie_privee.detail': 'Peu de données partent avant votre choix.',
  'domain.dns_email.plain': 'Courrier',
  'domain.dns_email.tech': 'Domaine et e-mail',
  'domain.dns_email.detail': 'Nous n’avons pas pu vérifier le courrier.',
  'demo.note': 'Exemple de rapport. Ce n’est pas un audit réel.',
  'section.categories': 'Ce qui compose la note',
  'section.findings': 'Quoi corriger',
  'section.table': 'Historique',
  'section.verify': 'Vérification',
  'section.gauges': 'Le chiffre dans le cercle',
  'section.gauges.lead':
    'Le chiffre reste lisible pour 0, 100 et l’absence de note.',
  'group.priority': 'À corriger en priorité',
  'group.next': 'À améliorer ensuite',
  'group.good': 'Ce qui va bien',
  'finding.fix': 'Voir comment corriger',
  'finding.effort': '{minutes} min',
  'finding.done': 'Rien à changer',
  'finding.unknown': 'Durée inconnue',
  'finding.untested': "Nous n'avons pas pu tester ce point.",
  'finding.copy': 'Copier',
  'finding.copied': 'Copié',
  'measure.lcp': "Votre site met {duree} à s'afficher (LCP).",
  'table.caption': 'Scores du 3 mars au 23 octobre 2026',
  'table.summary': '+12 points depuis le 3 mars',
  'table.date': 'Date',
  'table.score': 'Score',
  'table.level': 'Niveau',
  'table.row1.date': '3 mars 2026',
  'table.row2.date': '23 oct. 2026',
  'footer.method': 'Méthode {version}',
  'footer.hash': 'Empreinte {hash}',
  'footer.verify': 'Vérifier ce rapport',
  'verify.lead':
    'Le contrôle du fichier se fera dans votre navigateur, sans envoi.',
  'demo.https.title': 'Le site accepte encore une adresse non chiffrée',
  'demo.https.why':
    'Un visiteur peut envoyer des données sur une page lisible par d’autres.',
  'demo.https.s1': 'Ouvrez les en-têtes http de votre hébergeur.',
  'demo.https.s2': 'Redirigez toutes les adresses http vers https.',
  'demo.https.s3': 'Ajoutez la ligne qui force https pendant un an.',
  'demo.https.code': 'Strict-Transport-Security: max-age=31536000',
  'demo.https.source': 'Guide MDN sur HSTS',
  'demo.frame.title': 'La page peut être affichée dans un cadre trompeur',
  'demo.frame.why':
    'Un autre site peut présenter le vôtre comme s’il lui appartenait.',
  'demo.frame.s1': 'Ajoutez l’en-tête qui interdit les cadres.',
  'demo.frame.s2': 'Choisissez d’interdire l’affichage hors de votre site.',
  'demo.frame.source': 'Guide MDN sur les cadres',
  'demo.image.title': 'Certaines images sont plus lourdes que nécessaire',
  'demo.image.why': 'La page met plus de temps à s’afficher sur un téléphone.',
  'demo.image.s1': 'Compressez chaque image au-dessus de 200 kilo-octets.',
  'demo.image.s2': 'Écrivez la largeur et la hauteur dans la page.',
  'demo.desc.title': 'La description de la page est trop courte',
  'demo.desc.why':
    'Le résultat de recherche explique mal le contenu de la page.',
  'demo.desc.s1': 'Rédigez une description d’environ 150 caractères.',
  'demo.desc.s2': 'Dites ce que la page permet de faire.',
  'demo.title.title': 'Le titre de la page est clair',
  'demo.title.why':
    'La personne reconnaît l’onglet et le résultat de recherche.',
  'demo.title.s1': 'Conservez un titre qui décrit cette page.',
  'demo.lang.title': 'La langue de la page est indiquée',
  'demo.lang.why': 'Le lecteur d’écran utilise la bonne prononciation.',
  'demo.lang.s1': 'Gardez l’attribut de langue sur la page.',
  'demo.cookie.title': 'Les cookies avant le choix n’ont pas été vus',
  'demo.cookie.why':
    'Nous n’avons pas pu tester : le navigateur d’audit n’a pas tourné.',
  'demo.cookie.s1': 'Relancez l’audit lorsque ce navigateur est disponible.',
  'reason.active_unverified':
    'Nous n’avons pas pu tester : ce test demande un site vérifié.',
  'reason.missing_source':
    'Nous n’avons pas pu tester : une source manque ({source}).',
  'reason.timeout':
    'Nous n’avons pas pu tester : le test a dépassé {seconds} s.',
  'reason.error':
    'Nous n’avons pas pu tester : une erreur est survenue pendant le test.',
  'reason.invalid_result':
    'Nous n’avons pas pu tester : le résultat obtenu est inutilisable.',
  'securite.https.pass_redirect':
    'Les pages s’ouvrent en adresse chiffrée, et l’ancienne adresse y renvoie.',
  'securite.https.pass_no_http':
    'Les pages s’ouvrent en adresse chiffrée. L’ancienne adresse ne répond pas.',
  'securite.https.fail':
    'Le site s’ouvre sans chiffrement. Quelqu’un sur le réseau peut lire les échanges.',
  'securite.https.warn_off_host':
    'L’adresse non chiffrée part vers un autre nom. Le navigateur peut oublier la protection.',
  'securite.https.warn_delayed':
    'Le passage vers l’adresse chiffrée n’est pas immédiat. La première étape reste lisible.',
  'securite.hsts.pass':
    'Le navigateur refuse ensuite les adresses non chiffrées de ce site.',
  'securite.hsts.fail_missing':
    'Le navigateur peut encore tenter une adresse non chiffrée. La première visite reste exposée.',
  'securite.hsts.fail_invalid':
    'L’en-tête de durée de chiffrement est illisible. Le navigateur l’ignore.',
  'securite.hsts.fail_no_https':
    'Cette protection ne s’applique pas, le site n’a pas d’adresse chiffrée.',
  'securite.hsts.warn_short':
    'La protection contre l’adresse non chiffrée dure moins de six mois.',
  'securite.csp.pass':
    'Le site limite l’origine des scripts et des objets embarqués.',
  'securite.csp.fail_missing':
    'Aucune règle ne limite l’origine des scripts. Une page piégée peut en charger d’ailleurs.',
  'securite.csp.fail_invalid':
    'La règle d’origine des scripts est illisible. Le navigateur l’ignore.',
  'securite.csp.fail_unsafe':
    'La règle autorise des scripts trop larges. Une page piégée peut exécuter du code.',
  'securite.csp.warn_loose':
    'La règle bloque les scripts les plus risqués, mais elle reste trop ouverte.',
  'securite.xcto.pass':
    'Le navigateur respecte le type annoncé de chaque fichier.',
  'securite.xcto.warn_missing':
    'Le navigateur peut deviner le type d’un fichier. Un téléchargement peut alors s’exécuter.',
  'securite.xcto.fail':
    'Le type des fichiers est annoncé avec une valeur inconnue. Le navigateur l’ignore.',
  'securite.frames.pass':
    'Une autre page ne peut pas afficher la vôtre dans un cadre.',
  'securite.frames.fail':
    'Une autre page peut afficher la vôtre dans un cadre trompeur.',
  'securite.frames.warn_obsolete':
    'L’interdiction de cadre utilise une ancienne écriture. Les navigateurs actuels l’ignorent.',
  'securite.referrer.pass':
    'Le site limite l’adresse transmise quand un visiteur suit un lien.',
  'securite.referrer.pass_absent':
    'Aucun en-tête ne limite l’adresse envoyée. Les navigateurs récents la limitent déjà.',
  'securite.referrer.warn_legacy':
    'L’adresse complète part encore vers les autres sites chiffrés.',
  'securite.referrer.warn_unsafe':
    'Le site envoie trop d’adresse aux sites qui suivent. Un lien peut révéler la page.',
  'securite.referrer.fail_invalid':
    'L’en-tête qui limite l’adresse envoyée est illisible. Le navigateur l’ignore.',
  'securite.permissions.pass':
    'La caméra, le micro et la position sont refusés par défaut.',
  'securite.permissions.warn_missing':
    'La caméra, le micro ou la position peuvent encore être demandés.',
  'securite.permissions.fail_open':
    'Ces accès sont ouverts à tous les sites. Un cadre peut demander la caméra, le micro ou la position.',
  'securite.permissions.fail_invalid':
    'L’en-tête qui règle la caméra et le micro est illisible. Le navigateur l’ignore.',
  'securite.cookies.pass_none':
    'Aucune trace n’est déposée par la page sur votre navigateur.',
  'securite.cookies.pass':
    'Les traces déposées restent chiffrées, et le code de la page ne lit pas celles de session.',
  'securite.cookies.warn_hsts':
    'Une trace n’exige pas le chiffrement, mais l’adresse chiffrée est imposée.',
  'securite.cookies.fail_session_secure':
    'Une trace de session peut voyager sans chiffrement. Quelqu’un sur le réseau peut la copier.',
  'securite.cookies.fail_session_httponly':
    'Une trace de session est lisible par le code de la page. Un script piégé peut la prendre.',
  'securite.cookies.fail_secure':
    'Une trace peut voyager sans chiffrement. Elle peut être lue sur le réseau.',
  'securite.cookies.fail_samesite':
    'Une trace peut être envoyée depuis un autre site. Une action peut partir sans votre geste.',
  'securite.cookies.fail_prefix':
    'Une trace annonce un verrou que ses options contredisent. Le navigateur peut la refuser.',
  'securite.certificate.pass':
    'Le certificat est reconnu, au nom du site, pour encore {jours} jours.',
  'securite.certificate.fail_expired':
    'Le certificat est périmé. Les visiteurs voient une alerte et peuvent renoncer.',
  'securite.certificate.fail_not_yet':
    'Le certificat n’est pas encore valable. Les visiteurs voient une alerte.',
  'securite.certificate.fail_hostname':
    'Le certificat ne couvre pas le nom du site. Les visiteurs voient une alerte.',
  'securite.certificate.fail_chain':
    'Le navigateur ne reconnaît pas la chaîne du certificat. Les visiteurs voient une alerte.',
  'securite.certificate.warn_soon':
    'Le certificat expire dans {jours} jours. Après cette date, les visiteurs verront une alerte.',
  'securite.certificate.warn_today':
    'Le certificat expire dans moins d’un jour. Les visiteurs verront ensuite une alerte.',
  'securite.mixed.pass':
    'La page chiffrée ne charge aucun élément en adresse non chiffrée.',
  'securite.mixed.fail':
    'La page chiffrée charge du code en adresse non chiffrée. Ce code peut être modifié.',
  'securite.mixed.warn':
    'La page chiffrée charge des images ou des médias en adresse non chiffrée.',
  'securite.mixed.na_http':
    'Le contenu mixte ne s’applique pas, la page n’est pas chiffrée.',
  'securite.mixed.na_not_html':
    'Le contenu mixte n’est pas testé, la réponse n’est pas du HTML.',
  'securite.security_txt.pass':
    'Un fichier indique qui contacter en cas de faille, et il est encore valable.',
  'securite.security_txt.fail_missing':
    'Aucun fichier ne dit qui contacter si une faille est trouvée.',
  'securite.security_txt.fail_invalid':
    'Le fichier de contact est incomplet ou périmé. Personne ne sait qui écrire.',
  'securite.security_txt.warn_soon':
    'Le fichier de contact expire dans {jours} jours. Renouvelez-le avant cette date.',
  'securite.security_txt.warn_today':
    'Le fichier de contact expire dans moins d’un jour. Renouvelez-le maintenant.',
  'securite.security_txt.warn_legacy':
    'Le fichier de contact est à l’ancienne adresse. Placez-le dans le dossier prévu.',
  'securite.security_txt.warn_type':
    'Le fichier de contact n’est pas servi comme texte brut. Certains outils l’ignoreront.',
  'securite.security_txt.warn_canonical':
    'Le fichier de contact annonce une autre adresse que celle qui répond.',
  'securite.security_txt.untested_status':
    'Nous n’avons pas pu tester : le fichier de contact a répondu {status}.',
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof fr;
