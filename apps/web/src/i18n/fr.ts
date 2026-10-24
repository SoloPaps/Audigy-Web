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
  'performance.lighthouse.pass':
    'La vitesse mesurée est bonne : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.warn':
    'La vitesse mesurée est moyenne : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.fail':
    'La vitesse mesurée est trop faible : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'performance.lighthouse.partial':
    'Une des deux mesures de vitesse manque. Le score obtenu est {score} sur 100.',
  'performance.lcp.pass':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est rapide.',
  'performance.lcp.warn':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est un peu lent.',
  'performance.lcp.fail':
    'Les visiteurs voient l’essentiel en {secondes} secondes, ce qui est trop lent.',
  'performance.inp.pass':
    'Le site répond en {millisecondes} millisecondes. Les actions restent fluides.',
  'performance.inp.warn':
    'Le site répond en {millisecondes} millisecondes. L’attente peut gêner.',
  'performance.inp.fail':
    'Le site répond en {millisecondes} millisecondes. L’attente est trop longue.',
  'performance.cls.pass':
    'La page reste stable pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.cls.warn':
    'La page bouge un peu pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.cls.fail':
    'La page bouge trop pendant le chargement. Le décalage mesuré est {valeur}.',
  'performance.field.absent':
    'Nous n’avons pas de données de visite réelle pour ce site.',
  'performance.field.metric_absent':
    'Cette mesure de visite réelle n’est pas fournie pour ce site.',
  'performance.poids.pass':
    'La page pèse {poids}. Ce poids reste raisonnable pour l’affichage.',
  'performance.poids.warn':
    'La page pèse {poids}. Ce poids ralentit l’affichage.',
  'performance.poids.fail':
    'La page pèse {poids}. Ce poids ralentit fortement l’affichage.',
  'performance.poids.pass_sans_valeur':
    'Le poids de la page reste raisonnable.',
  'performance.poids.warn_sans_valeur':
    'Le poids de la page alourdit l’affichage.',
  'performance.poids.fail_sans_valeur':
    'Le poids de la page ralentit fortement l’affichage.',
  'performance.cache.pass':
    'Le navigateur peut garder les fichiers déjà téléchargés.',
  'performance.cache.warn':
    'Certains fichiers sont rechargés trop souvent. La page met plus de temps.',
  'performance.cache.fail':
    'Les fichiers sont rechargés presque à chaque visite. La page met plus de temps.',
  'performance.compression.pass':
    'Les textes de la page sont compressés avant l’envoi.',
  'performance.compression.warn':
    'Une partie des textes n’est pas compressée. L’envoi est plus lent.',
  'performance.compression.fail':
    'Les textes de la page ne sont pas compressés. L’envoi est plus lent.',
  'performance.audit.na': 'Cette mesure ne s’applique pas à cette page.',
  'performance.quota':
    'Nous n’avons pas pu tester : le quota de mesure est atteint.',
  'performance.missing_key':
    'Nous n’avons pas pu tester : la source de mesure n’est pas configurée.',
  'performance.error':
    'Nous n’avons pas pu tester : la mesure de vitesse a échoué.',
  'seo.page.untested_status':
    'Nous n’avons pas pu tester : la page a répondu {status}.',
  'seo.page.na_not_html':
    'La page n’est pas au format HTML. Ce contrôle ne s’applique pas.',
  'seo.lighthouse.pass':
    'Le référencement mesuré est bon : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.warn':
    'Le référencement mesuré est moyen : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.fail':
    'Le référencement mesuré est faible : {mobile} sur 100 au téléphone, {desktop} sur 100 sur ordinateur.',
  'seo.lighthouse.partial':
    'Une des deux mesures de référencement manque. Le score obtenu est {score} sur 100.',
  'seo.lighthouse.missing_key':
    'Nous n’avons pas pu tester : la source de mesure n’est pas configurée.',
  'seo.lighthouse.quota':
    'Nous n’avons pas pu tester : le quota de mesure est atteint.',
  'seo.lighthouse.error':
    'Nous n’avons pas pu tester : la mesure de référencement a échoué.',
  'seo.lighthouse.absent':
    'Nous n’avons pas pu tester : la note de référencement est absente.',
  'seo.robots.pass':
    'Le fichier robots laisse les moteurs explorer cette adresse.',
  'seo.robots.pass_absent':
    'Aucun fichier robots n’est publié. Les moteurs peuvent explorer le site.',
  'seo.robots.fail_block':
    'Le fichier robots interdit l’exploration de cette adresse. Elle peut sortir des résultats.',
  'seo.robots.fail_html':
    'Le fichier robots n’est pas un texte de règles. Les moteurs peuvent l’ignorer.',
  'seo.robots.untested_status':
    'Nous n’avons pas pu tester : le fichier robots a répondu {status}.',
  'seo.robots.na_scope':
    'Le fichier robots est à la racine du domaine, hors du chemin audité.',
  'seo.sitemap.pass': 'Le plan du site est lisible et ses adresses répondent.',
  'seo.sitemap.pass_sample':
    'Le plan du site est lisible. Les {count} premières adresses sur {total} répondent.',
  'seo.sitemap.warn_missing':
    'Aucun plan du site n’est publié. Les moteurs découvrent les pages plus lentement.',
  'seo.sitemap.warn_redirect':
    'Certaines adresses du plan changent de page. Le plan devrait citer l’adresse finale.',
  'seo.sitemap.warn_external':
    'Le plan cite des adresses d’un autre site. Seules celles de ce site ont été vérifiées.',
  'seo.sitemap.fail_status_one':
    '1 adresse du plan ne répond pas. Les moteurs peuvent ignorer cette page.',
  'seo.sitemap.fail_status_many':
    '{count} adresses du plan ne répondent pas. Les moteurs peuvent ignorer ces pages.',
  'seo.sitemap.fail_xml':
    'Le plan du site n’est pas un fichier lisible. Les moteurs ne peuvent pas l’utiliser.',
  'seo.sitemap.fail_empty':
    'Le plan du site ne contient aucune adresse. Les moteurs n’y trouvent rien.',
  'seo.sitemap.fail_file':
    'Le plan annoncé ne répond pas. Les moteurs ne peuvent pas le lire.',
  'seo.sitemap.untested_status':
    'Nous n’avons pas pu tester : le plan du site a répondu {status}.',
  'seo.sitemap.na_scope':
    'Le plan du site est à la racine du domaine, hors du chemin audité.',
  'seo.noindex.pass':
    'La page peut apparaître dans les résultats de recherche.',
  'seo.noindex.fail':
    'La page demande à rester hors des résultats. Les moteurs ne l’afficheront pas.',
  'seo.canonical.pass': 'L’adresse de référence est celle de cette page.',
  'seo.canonical.warn_missing':
    'La page n’indique pas son adresse de référence. Un doublon peut prendre sa place.',
  'seo.canonical.warn_other':
    'L’adresse de référence pointe vers une autre page. Les visites peuvent s’y concentrer.',
  'seo.canonical.warn_repeat':
    'L’adresse de référence est écrite plusieurs fois. Une seule suffit.',
  'seo.canonical.fail_conflict':
    'La page indique plusieurs adresses de référence. Les moteurs ne savent pas laquelle garder.',
  'seo.canonical.fail_other_host':
    'L’adresse de référence pointe vers un autre site. Cette page peut sortir des résultats.',
  'seo.canonical.fail_invalid':
    'L’adresse de référence est illisible. Les moteurs ne peuvent pas l’utiliser.',
  'seo.title.pass':
    'Le titre décrit la page et tient dans le résultat de recherche.',
  'seo.title.warn_short':
    'Le titre ne fait que {count} caractères. Il décrit trop peu la page.',
  'seo.title.warn_long':
    'Le titre fait {count} caractères. La fin sera coupée dans le résultat.',
  'seo.title.fail_missing':
    'La page n’a pas de titre. Le résultat de recherche reste vague.',
  'seo.title.fail_duplicate':
    'La page a plusieurs titres différents. Le résultat de recherche devient ambigu.',
  'seo.title.warn_repeat':
    'Le titre est répété plusieurs fois. Un seul titre suffit.',
  'seo.description.pass':
    'La description résume la page dans le résultat de recherche.',
  'seo.description.warn_missing':
    'La page n’a pas de description. Le résultat de recherche est choisi à votre place.',
  'seo.description.warn_short':
    'La description ne fait que {count} caractères. Elle explique trop peu la page.',
  'seo.description.warn_long':
    'La description fait {count} caractères. La fin sera coupée dans le résultat.',
  'seo.description.warn_same':
    'Le titre et la description répètent le même texte. Le résultat de recherche est pauvre.',
  'seo.description.warn_duplicate':
    'La page a plusieurs descriptions différentes. Le résultat de recherche devient ambigu.',
  'seo.description.warn_repeat':
    'La description est répétée plusieurs fois. Une seule suffit.',
  'seo.hreflang.pass':
    'Les langues déclarées ont une adresse et cette page s’y cite.',
  'seo.hreflang.na':
    'Aucune autre langue n’est déclarée. Rien à signaler si le site est en une langue.',
  'seo.hreflang.warn_self':
    'La page ne se cite pas parmi ses langues. Les moteurs peuvent ignorer le lien.',
  'seo.hreflang.warn_relative':
    'Une langue pointe vers une adresse relative. Les moteurs demandent une adresse complète.',
  'seo.hreflang.fail_lang':
    'Un code de langue est invalide. Les moteurs ignorent cette déclaration.',
  'seo.hreflang.fail_conflict':
    'Une langue vise deux adresses. Les moteurs ne savent pas laquelle choisir.',
  'seo.hreflang.fail_href':
    'Une langue n’a pas d’adresse utilisable. Les moteurs ignorent cette déclaration.',
  'seo.jsonld.pass':
    'La page décrit son contenu pour les moteurs, avec le type {type}.',
  'seo.jsonld.warn_missing':
    'La page ne décrit pas son contenu aux moteurs. Le résultat de recherche reste pauvre.',
  'seo.jsonld.warn_type':
    'Le type {type} n’est pas dans la liste de base. La lecture peut rester incomplète.',
  'seo.jsonld.fail_parse':
    'Une donnée structurée est illisible. Les moteurs l’ignorent.',
  'seo.jsonld.fail_type':
    'Une donnée structurée n’a pas de type. Les moteurs l’ignorent.',
  'dns_email.na_github':
    'Ce nom est sur github.io. Le courrier et le DNS du domaine ne se règlent pas ici.',
  'dns_email.na_address':
    'Une adresse IP n’a pas de réglage de courrier. Ce test ne s’applique pas.',
  'dns_email.untested': 'Nous n’avons pas pu tester : le DNS n’a pas répondu.',
  'dns_email.mx.pass': 'Des serveurs de courrier sont annoncés pour ce nom.',
  'dns_email.mx.pass_null':
    'Ce nom refuse le courrier. C’est annoncé clairement.',
  'dns_email.mx.warn_absent':
    'Aucun serveur de courrier n’est annoncé. Un message peut viser l’adresse du site.',
  'dns_email.mx.fail_mix':
    'Le refus de courrier est mélangé à d’autres serveurs. Le réglage est incohérent.',
  'dns_email.mx.fail_syntax':
    'L’annonce des serveurs de courrier est illisible.',
  'dns_email.spf.pass':
    'Seuls les serveurs annoncés peuvent envoyer du courrier avec ce nom.',
  'dns_email.spf.pass_refuse':
    'Ce nom interdit tout envoi de courrier à son sujet.',
  'dns_email.spf.fail_missing':
    'Rien n’indique qui peut envoyer du courrier avec ce nom. N’importe qui peut l’imiter.',
  'dns_email.spf.fail_open':
    'Ce nom n’interdit pas les faux envois. N’importe qui peut l’imiter.',
  'dns_email.spf.fail_multiple':
    'Plusieurs annonces d’expéditeurs se contredisent. Les serveurs de courrier les ignorent.',
  'dns_email.spf.fail_syntax':
    'L’annonce des expéditeurs autorisés est illisible. Elle est ignorée.',
  'dns_email.spf.fail_plus':
    'Tout le monde peut envoyer du courrier avec ce nom. Retirez cette autorisation.',
  'dns_email.spf.fail_lookups':
    'L’annonce demande {lookups} consultations DNS. Au-delà de 10, elle est ignorée.',
  'dns_email.spf.fail_void':
    'Trop de noms cités n’existent pas. L’annonce des expéditeurs est ignorée.',
  'dns_email.spf.fail_loop':
    'L’annonce des expéditeurs se renvoie à elle-même. Elle est ignorée.',
  'dns_email.spf.warn_soft':
    'Les faux messages sont signalés, pas refusés. Une partie peut encore arriver.',
  'dns_email.spf.warn_neutral':
    'L’annonce ne tranche pas. Un faux message peut partir avec ce nom.',
  'dns_email.spf.warn_ptr':
    'L’annonce s’appuie sur un mécanisme déconseillé. Les contrôles deviennent fragiles.',
  'dns_email.spf.warn_macro':
    'L’annonce varie selon l’expéditeur. Le nombre de consultations n’est pas certain.',
  'dns_email.dmarc.pass':
    'Les faux messages sont refusés, et un rapport est prévu.',
  'dns_email.dmarc.pass_reject': 'Les faux messages pour ce nom sont refusés.',
  'dns_email.dmarc.fail_missing':
    'Rien ne dit quoi faire des faux messages. Ils peuvent arriver en boîte.',
  'dns_email.dmarc.fail_spoof':
    'Ce nom peut être imité. Refusez les faux messages, puisqu’il n’envoie pas de courrier.',
  'dns_email.dmarc.fail_not_reject':
    'Ce nom n’envoie pas de courrier, mais les faux messages ne sont pas tous refusés.',
  'dns_email.dmarc.fail_syntax':
    'La règle sur les faux messages est illisible. Elle est ignorée.',
  'dns_email.dmarc.fail_multiple':
    'Plusieurs règles se contredisent. Les serveurs de courrier les ignorent.',
  'dns_email.dmarc.warn_none':
    'Les faux messages sont seulement observés. Ils peuvent encore arriver.',
  'dns_email.dmarc.warn_quarantine':
    'Les faux messages vont en indésirables. Ils ne sont pas tous refusés.',
  'dns_email.dmarc.warn_pct':
    'La règle ne couvre que {pct} pour cent des messages. Le reste passe.',
  'dns_email.dmarc.warn_rua':
    'Aucun rapport ne vous prévient des faux messages. Vous ne les verrez pas.',
  'dns_email.dkim.pass':
    'Une signature de courrier est annoncée ({selectors}).',
  'dns_email.dkim.warn_missing':
    'Aucune signature courante n’est annoncée. Le courrier peut quand même en avoir une.',
  'dns_email.dkim.warn_invalid':
    'Une signature annoncée est inutilisable. Les serveurs peuvent l’ignorer.',
  'dns_email.dkim.na_nomail':
    'Sans courrier, une signature n’est pas nécessaire.',
  'dns_email.caa.pass':
    'Seuls les organismes cités peuvent créer un certificat pour ce nom.',
  'dns_email.caa.pass_none':
    'Aucun organisme n’est autorisé à créer un certificat pour ce nom.',
  'dns_email.caa.warn_missing':
    'N’importe quel organisme peut créer un certificat pour ce nom.',
  'dns_email.caa.fail_syntax':
    'La liste des organismes autorisés est illisible.',
  'dns_email.caa.fail_critical':
    'Une contrainte inconnue bloque la lecture de cette liste.',
  'dns_email.dnssec.pass':
    'Le nom est signé. Un faux serveur DNS est plus difficile à glisser.',
  'dns_email.dnssec.fail':
    'Le nom n’est pas signé (DNSSEC). Un faux serveur DNS peut répondre à sa place.',
  'dns_email.mta_sts.pass':
    'Les serveurs de courrier exigent un chiffrement, et le fichier de règle est en place.',
  'dns_email.mta_sts.warn_missing':
    'Le chiffrement du courrier n’est pas exigé. Un intermédiaire peut le retirer.',
  'dns_email.mta_sts.warn_testing':
    'La règle de chiffrement est en essai. Elle n’est pas encore imposée.',
  'dns_email.mta_sts.warn_none':
    'La règle de chiffrement est désactivée. Elle ne protège pas le courrier.',
  'dns_email.mta_sts.fail_policy':
    'L’annonce de chiffrement existe, mais le fichier de règle est absent.',
  'dns_email.mta_sts.fail_syntax':
    'L’annonce de chiffrement du courrier est illisible.',
  'dns_email.mta_sts.na_nomail':
    'Sans courrier entrant, cette règle de chiffrement ne s’applique pas.',
  'dns_email.mta_sts.untested':
    'Nous n’avons pas pu tester : le fichier de règle n’a pas répondu.',
  'dns_email.tls_rpt.pass':
    'Les échecs de chiffrement du courrier vous sont signalés.',
  'dns_email.tls_rpt.warn_missing':
    'Les échecs de chiffrement du courrier ne vous sont pas signalés.',
  'dns_email.tls_rpt.fail_syntax':
    'L’annonce des rapports de chiffrement est illisible.',
  'dns_email.tls_rpt.na_nomail':
    'Sans courrier entrant, ces rapports ne s’appliquent pas.',
  'qualite.na_robots':
    'Le fichier robots interdit cette adresse. Ce contrôle ne s’applique pas.',
  'qualite.untested_robots':
    'Nous n’avons pas pu tester : le fichier robots a répondu {status}.',
  'qualite.untested_robots_down':
    'Nous n’avons pas pu tester : le fichier robots n’a pas répondu.',
  'qualite.untested_status':
    'Nous n’avons pas pu tester : la page a répondu {status}.',
  'qualite.untested_down':
    'Nous n’avons pas pu tester : la page n’a pas répondu.',
  'qualite.na_not_html':
    'La page n’est pas au format HTML. Ce contrôle ne s’applique pas.',
  'qualite.na_scope':
    'La page demandée quitte la zone auditée. La suite n’est pas lue.',
  'qualite.untested_budget':
    'Nous n’avons pas pu tester : le budget de requêtes est atteint.',
  'qualite.liens.pass': 'Les liens vérifiés répondent.',
  'qualite.liens.fail_internal_one':
    '1 lien interne ne répond pas. La page citée est inaccessible.',
  'qualite.liens.fail_internal_many':
    '{count} liens internes ne répondent pas. Ces pages sont inaccessibles.',
  'qualite.liens.fail_external_one':
    '1 lien vers un autre site est introuvable.',
  'qualite.liens.fail_external_many':
    '{count} liens vers d’autres sites sont introuvables.',
  'qualite.liens.warn_temp_one':
    '1 lien externe a eu une erreur temporaire. Ce n’est pas un lien mort.',
  'qualite.liens.warn_temp_many':
    '{count} liens externes ont eu une erreur temporaire. Ce n’est pas un lien mort.',
  'qualite.liens.warn_uncertain_one':
    '1 lien externe n’a pas répondu clairement. Ce n’est pas un lien mort.',
  'qualite.liens.warn_uncertain_many':
    '{count} liens externes n’ont pas répondu clairement. Ce n’est pas un lien mort.',
  'qualite.html.pass':
    'Le HTML des pages lues respecte les règles essentielles.',
  'qualite.html.fail_one':
    '1 page a du HTML invalide. Un navigateur peut mal l’afficher.',
  'qualite.html.fail_many':
    '{count} pages ont du HTML invalide. Un navigateur peut mal les afficher.',
  'qualite.images_poids.pass': 'Les images mesurées restent sous 200 Ko.',
  'qualite.images_poids.fail_one':
    '1 image dépasse 200 Ko. Elle ralentit l’affichage.',
  'qualite.images_poids.fail_many':
    '{count} images dépassent 200 Ko. Elles ralentissent l’affichage.',
  'qualite.images_poids.warn_unknown_one':
    'La taille d’une image n’est pas indiquée. Son poids n’est pas vérifié.',
  'qualite.images_poids.warn_unknown_many':
    'La taille de {count} images n’est pas indiquée. Leur poids n’est pas vérifié.',
  'qualite.images_poids.na': 'Aucune image n’est à mesurer sur les pages lues.',
  'qualite.images_dimensions.pass':
    'Chaque image indique sa largeur et sa hauteur.',
  'qualite.images_dimensions.warn_one':
    '1 image n’a pas ses dimensions. La page peut bouger au chargement.',
  'qualite.images_dimensions.warn_many':
    '{count} images n’ont pas leurs dimensions. La page peut bouger au chargement.',
  'qualite.images_dimensions.fail':
    'Aucune image n’a de largeur ni de hauteur. La page peut bouger au chargement.',
  'qualite.images_dimensions.na':
    'Aucune image n’est affichée sur les pages lues.',
  'qualite.images_format.pass':
    'Les images proposent un format moderne, WebP ou AVIF.',
  'qualite.images_format.warn_one':
    '1 image reste dans un ancien format. Elle pèse plus que nécessaire.',
  'qualite.images_format.warn_many':
    '{count} images restent dans un ancien format. Elles pèsent plus que nécessaire.',
  'qualite.images_format.fail':
    'Aucune image n’utilise un format moderne. Elles pèsent plus que nécessaire.',
  'qualite.images_format.na':
    'Aucune image bitmap n’est affichée. Ce contrôle ne s’applique pas.',
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof fr;
