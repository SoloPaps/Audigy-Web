# Questions pour le propriétaire

Chaque question a un **défaut recommandé**. Sans réponse, l'agent applique le défaut.
Bloquantes pour le déploiement final : Q1, Q2, Q7, Q9, Q18, Q23, Q24.

## Hébergement et coûts

1. **Équipe Netlify séparée pour Audigy ?** Les 300 crédits gratuits sont partagés par équipe ; s'ils sont épuisés, *tous* les sites de l'équipe sont mis en pause, y compris angelique-osteo.fr.
   Défaut : **oui, une équipe Netlify gratuite dédiée à Audigy**.
2. **Fonctions aux US acceptées ?** En gratuit, les fonctions Netlify tournent en Ohio (choix de région réservé au Pro). Les données sont stockées en UE (Supabase), seul le traitement transite.
   Défaut : **accepté pour la v1**, documenté dans la politique de confidentialité ; réexaminé avant l'ouverture au public.
3. **Où tourne le navigateur d'audit en v1 ?** (axe, cookies, captures, PDF)
   Défaut : **GitHub Actions (déclenché par l'app) + CLI locale** sur votre PC.
4. **Et pour le public plus tard ?** Les conditions de GitHub Actions ne visent pas un service public d'audit.
   Défaut : **à décider avant l'ouverture** (piste : petite machine gratuite en UE) ; d'ici là, ces tests affichent « Non testé » pour les autres utilisateurs.
5. **Région Supabase ?**
   Défaut : **Paris (eu-west-3)** si proposée, sinon Francfort.
6. **Visibilité et licence du code ?** Le repo est privé.
   Défaut : **rester privé pendant le dev** ; licence AGPL-3.0 si vous le rendez public.

## Nom, domaine, e-mail

7. **Nom de domaine pour Audigy ?** Sans domaine propre, les e-mails (connexion, alertes) arrivent mal et Audigy aurait lui-même une mauvaise note DNS/e-mail.
   Défaut : **acheter un domaine (~10 €/an)** ; sinon `*.netlify.app` et e-mails dégradés.
8. **Vérifier la marque « Audigy » ?** Le nom est déjà utilisé par Creative Labs (cartes son), à vérifier.
   Défaut : **recherche INPI/EUIPO avant l'ouverture au public** ; usage privé d'ici là.

## Preuve et rapports

9. **Horodatage qualifié eIDAS ?** Les TSA gratuites (FreeTSA, DigiCert, Sectigo) ne sont pas qualifiées. Un horodatage qualifié passe par un prestataire de la liste de confiance UE, en général payant.
   Défaut : **RFC 3161 gratuit non qualifié, auprès de 2 TSA, mentionné honnêtement** sur le rapport.
10. **Signature électronique ?**
    Défaut : **signature Ed25519 du manifeste par Audigy** (signature simple) ; signature PAdES dans le PDF après la v1.
11. **Durée de conservation des artefacts ?** (stockage gratuit : 1 Go)
    Défaut : **résultats : illimité ; captures et PDF : 12 mois ; WARC : seulement sur « rapport probant », 12 mois**.
12. **Relecture juridique** des CGU, de la liste des tests actifs et des mentions du rapport (« n'est pas un constat de commissaire de justice », eIDAS) ?
    Défaut : **relecture par vous avant l'ouverture** ; avis d'un juriste recommandé avant le public.

## Données Google

13. **Avis Google (réputation) ?** L'API Places demande un compte de facturation Google (carte bancaire), même si les paliers gratuits suffisent.
    Défaut : **désactivé en v1** ; activable plus tard avec votre clé.
14. **Statut de l'app OAuth Search Console ?** En mode « test », les jetons expirent au bout de 7 jours (à confirmer).
    Défaut : **app publiée « en production » non vérifiée, pour vous seul** ; vérification Google avant l'ouverture.

## Comptes et usage

15. **Méthode de connexion ?**
    Défaut : **lien magique par e-mail**, sans mot de passe.
16. **Audit sans compte pour le public ?**
    Défaut : **oui, passif seulement, 3 par jour, résultats gardés 7 jours**.
17. **Fréquences par défaut ?**
    Défaut : **audit hebdo le lundi à 6 h, disponibilité toutes les 15 min, résumé le lundi à 8 h** (heure de Paris).
18. **Éditeur du site (mentions légales) ?** Un particulier non professionnel peut ne donner son identité qu'à l'hébergeur (à confirmer).
    Défaut : **vous, en tant que particulier non professionnel**, avec l'hébergeur et un e-mail de contact.

## Méthode de notation

19. **En-têtes impossibles à régler sur GitHub Pages : comptés dans le score ?**
    Défaut : **comptés** (score objectif), avec la mention « non modifiable chez cet hébergeur » et une alternative.
20. **Score Performance : mobile, desktop ou les deux ?**
    Défaut : **mobile pour le score**, desktop affiché à côté.
21. **Pondération du score global ?**
    Défaut : **poids égaux sur les 8 domaines** ; Réputation et Disponibilité affichées à part.
22. **Respect de `robots.txt` pour le crawl, même sur un site vérifié ?**
    Défaut : **oui, toujours**, robot identifié « AudigyBot ».

## Déploiement

23. **Quand faire l'unique déploiement ?**
    Défaut : **après PART-26 (tout le périmètre)** ; vous utilisez la version locale dès le jalon MVP (PART-17).
24. **Comment déployer ?**
    Défaut : **`netlify deploy --build --prod` depuis votre PC**, site non lié à GitHub.

## Divers

25. **« Pulso » = heypulso.com** (maintenance WordPress) ?
    Défaut : **oui**, sinon donnez l'URL.
26. **Deuxième langue ?**
    Défaut : **anglais, après la v1**.
27. **Modèles Cursor ?**
    Défaut : **Auto pour les PARTS « Éco »**, modèle fort seulement pour les PARTS « Fort » ; une conversation neuve par PART.
