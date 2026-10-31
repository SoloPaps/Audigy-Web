# Index des maquettes Audixio

Mis à jour le 29/10/2026 (réorganisation). Fusion de l'ancien `INDEX.md` et de `README.md` des maquettes (originaux : `../../archive/fusionnes-2026-10-29/`). Statuts repris de la vérification du 29/10/2026.

> **Rappels (29/10/2026)** — détail : [00-DECISIONS.md](../../00-DECISIONS.md)
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Notes **A à F** (E et F ajoutées). Pas de /100.
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.

## Dossiers

| Dossier | Contenu |
|---|---|
| `finales/` | Maquettes de référence actuelles (ex-`design_complet`). « Finale » = dossier de référence, même si l'écran est encore **à refaire**. |
| `stitch/` | Exports Stitch (notes du rapport du 28/10). Le ZIP `stitch-rapport-2026-10-28.zip` cité par les anciens docs **n'existe pas** dans le dépôt. |
| `chrome/` | Références nav / header / footer : canons et PNG. |
| `archive/` | Maquettes obsolètes. |

## Règles (reprises de l'ancien README)

1. **Body** : coller à la structure du `code.html` de la maquette.
2. **Shell** : remplacer header / footer / logo de la maquette par les composants partagés (logo officiel, Inter, nav canon, footer compact) — voir `../01-REGLES-STRICTES.md` et `../workflow-Cursor-shell-pages-motion.md`.
3. Produit : `../../produit/FONCTIONNEMENT.md`. En conflit chrome vs maquette, **les règles gagnent**.
4. Logo : `../logos/audixio-logos/out/` (lockup PC clair dans le header).
5. Claims inventés (souverain / crypto / 48 sondes / carbone / scellement…) : adoucir ou retirer pendant l'intégration.
6. Couleurs de la maquette ≠ tokens produit : remap vers la palette v2.
7. Il n'y a **aucun** `screen.png` dans les dossiers : seuls les fichiers HTML existent.

## Maquettes finales

| Page | Fichier | Statut | Remarque |
|---|---|---|---|
| Popup « Passer Pro » (limite atteinte) | [`finales/interface_passer_pro/interface_passer_pro.html`](finales/interface_passer_pro/interface_passer_pro.html) | **finale (à relire)** | ajoutée après la vérification du 29/10 ; non vérifiée |
| Erreur 404 | [`finales/page_404/page_404.html`](finales/page_404/page_404.html) | **à refaire** | Audixio, /100 |
| Erreur 500 | [`finales/page_500/page_500.html`](finales/page_500/page_500.html) | **finale (à relire)** | ajoutée après la vérification du 29/10 ; non vérifiée |
| Acceptation de l'accès | [`finales/page_acceptation_acces/page_acceptation_acces.html`](finales/page_acceptation_acces/page_acceptation_acces.html) | **finale** |  |
| Déclaration d'accessibilité | [`finales/page_accessibilite/page_accessibilite.html`](finales/page_accessibilite/page_accessibilite.html) | **à refaire** | Audixio |
| Accueil | [`finales/page_accueil/page_accueil.html`](finales/page_accueil/page_accueil.html) | **à refaire** | /100 à retirer ; version plus récente sur la box (`themes-v2/accueil-foundations.html`) |
| Brief IA | [`finales/page_brief_ia/page_brief_ia.html`](finales/page_brief_ia/page_brief_ia.html) | **à refaire** | /100 |
| Mon compte (fichier `compte.html`) | [`finales/page_compte/page_compte.html`](finales/page_compte/page_compte.html) | **à refaire** | marque Audixio ; ajouter mot de passe, comptes liés Google/GitHub, « Accès partagés » |
| CGU | [`finales/page_conditions_utilisation/page_conditions_utilisation.html`](finales/page_conditions_utilisation/page_conditions_utilisation.html) | **à refaire** | Audixio |
| Demande d'accès (modale) | [`finales/page_demande_acces/page_demande_acces.html`](finales/page_demande_acces/page_demande_acces.html) | **finale** | appelée `interface_demande_acces` dans les anciens docs |
| Domaine restreint (ex. Sécurité) | [`finales/page_domaine_restreint/page_domaine_restreint.html`](finales/page_domaine_restreint/page_domaine_restreint.html) | **finale** | garde les pastilles HTTPS / HSTS / X-Frame (29/10) |
| Questionnaire écologie RGESN | [`finales/page_ecologie/page_ecologie.html`](finales/page_ecologie/page_ecologie.html) | **finale** |  |
| Exemple / démo de rapport | [`finales/page_exemple_rapport/page_exemple_rapport.html`](finales/page_exemple_rapport/page_exemple_rapport.html) | **à refaire** | /100 |
| Maintenance | [`finales/page_maintenance/page_maintenance.html`](finales/page_maintenance/page_maintenance.html) | **finale (à relire)** | ajoutée après la vérification du 29/10 ; non vérifiée |
| Mentions légales | [`finales/page_mentions_legales/page_mentions_legales.html`](finales/page_mentions_legales/page_mentions_legales.html) | **à refaire** | Audixio |
| Méthode et barème | [`finales/page_methode_bareme/page_methode_bareme.html`](finales/page_methode_bareme/page_methode_bareme.html) | **finale** | version plus récente sur la box (`themes-v2/methode.html`) |
| Politique de confidentialité | [`finales/page_politique_confidentialite/page_politique_confidentialite.html`](finales/page_politique_confidentialite/page_politique_confidentialite.html) | **à refaire** | Audixio ; ajouter mot de passe et OAuth comme traitements |
| Pro — comparatif Gratuit/Pro + liste d'attente (cible de « Tarifs ») | [`finales/page_pro/page_pro.html`](finales/page_pro/page_pro.html) | **finale** |  |
| Analyse en cours | [`finales/page_progression/page_progression.html`](finales/page_progression/page_progression.html) | **à refaire** | /100 |
| Détail d'un constat (+ « plan d'action ») | [`finales/page_rapport_details/page_rapport_details.html`](finales/page_rapport_details/page_rapport_details.html) | **à refaire** | /100 ; ajouter le plan d'action CMS / code (29/10) |
| Domaine ouvert (ex. Performance) | [`finales/page_rapport_domaine/page_rapport_domaine.html`](finales/page_rapport_domaine/page_rapport_domaine.html) | **finale** |  |
| Hub du rapport (adaptatif, bandeau de statut) | [`finales/page_rapport_hub/page_rapport_hub.html`](finales/page_rapport_hub/page_rapport_hub.html) | **à refaire** | /100 ; version à jour sur la box (`themes-v2/rapport-hub-statuts.html`) |
| Sites suivis | [`finales/page_site_suivi/page_site_suivi.html`](finales/page_site_suivi/page_site_suivi.html) | **finale** |  |
| Vérifier la propriété | [`finales/page_verifier_propriete/page_verifier_propriete.html`](finales/page_verifier_propriete/page_verifier_propriete.html) | **à refaire** | 4 méthodes → 5 (ajouter le fichier `.well-known`, 29/10) |
| Bienvenue (après inscription) | [`finales/page_bienvenue/page_bienvenue.html`](finales/page_bienvenue/page_bienvenue.html) | **finale (à relire)** | ajoutée 30/10, checklist 3 étapes |
| Rapport PDF (aperçu impression) | [`finales/page_rapport_pdf/page_rapport_pdf.html`](finales/page_rapport_pdf/page_rapport_pdf.html) | **finale (à relire)** | ajoutée 30/10, 3 pages A4, lien depuis le hub |
| Plan d’action | [`finales/page_plan_action/page_plan_action.html`](finales/page_plan_action/page_plan_action.html) | **finale (à relire)** | ajoutée 30/10, lien depuis le brief IA |
| Badge de note (modale de partage) | [`finales/interface_badge_partage/interface_badge_partage.html`](finales/interface_badge_partage/interface_badge_partage.html) | **finale (à relire)** | ajoutée 30/10, lien depuis le hub |
| Historique (Pro) | [`finales/pages_historique_monsite/pages_historique_monsite.html`](finales/pages_historique_monsite/pages_historique_monsite.html) | **finale** | Pro gelé |
| Connexion / inscription / mot de passe oublié / confirmation d'e-mail (4 vues) | [`finales/interface_connexion/interface_connexion.html`](finales/interface_connexion/interface_connexion.html) | **finale (à relire)** | ajoutée 30/10 ; e-mail + mot de passe, Google, GitHub ; cible du bouton « Connexion » de la nav |
| Bandeau cookies (consentement CNIL) | [`finales/interface_bandeau_cookies/interface_bandeau_cookies.html`](finales/interface_bandeau_cookies/interface_bandeau_cookies.html) | **finale (à relire)** | ajoutée 30/10 ; Accepter / Refuser / Personnaliser au même niveau ; `FONCTIONNEMENT.md` §16 |
| Robot Audixio (UA, robots.txt, opt-out) | [`finales/page_robot_audixio/page_robot_audixio.html`](finales/page_robot_audixio/page_robot_audixio.html) | **finale (à relire)** | ajoutée 30/10 ; route `/robot` ; `FONCTIONNEMENT.md` §15 |
| Réinitialisation du mot de passe (2 états : demande du lien, nouveau mot de passe) | [`finales/page_reinitialisation_mot_de_passe/page_reinitialisation_mot_de_passe.html`](finales/page_reinitialisation_mot_de_passe/page_reinitialisation_mot_de_passe.html) | **finale (à relire)** | ajoutée 30/10 ; route `/mot-de-passe/reinitialiser` ; cible de « Mot de passe oublié ? » dans `interface_connexion` |
| E-mail confirmé (après clic sur le lien) | [`finales/page_email_confirme/page_email_confirme.html`](finales/page_email_confirme/page_email_confirme.html) | **finale (à relire)** | ajoutée 30/10 ; route `/email-confirme` |
| Audit échoué (3 cas : échec, accès refusé 403/WAF, site injoignable) | [`finales/page_audit_echoue/page_audit_echoue.html`](finales/page_audit_echoue/page_audit_echoue.html) | **finale (à relire)** | ajoutée 30/10 ; route `/audit/:id/echec` ; « Relancer » → `page_progression` ; lien `page_robot_audixio` |
| Modale « Partager » (copier, créer, révoquer un lien) | [`finales/interface_partager/interface_partager.html`](finales/interface_partager/interface_partager.html) | **finale (à relire)** | ajoutée 30/10 ; modale sur fond flouté ; cible de « Partager » du hub ; lien `interface_badge_partage` |
| Sites suivis vide (premier site) | [`finales/page_sites_suivis_vide/page_sites_suivis_vide.html`](finales/page_sites_suivis_vide/page_sites_suivis_vide.html) | **finale (à relire)** | ajoutée 30/10 ; état vide de `/sites` ; CTA « Lancer un audit » |
| Réglages des alertes (gratuit fixe / Pro réglable) | [`finales/page_reglages_alertes/page_reglages_alertes.html`](finales/page_reglages_alertes/page_reglages_alertes.html) | **finale (à relire)** | ajoutée 30/10 ; route `/compte/alertes` ; SSL 14 j en gratuit ; Pro : seuils, délai SSL, fréquence, récap du lundi ; partie Pro verrouillée en gratuit ; liens depuis `page_compte` et `page_site_suivi` |
| E-mail : confirmation d'inscription | [`finales/email_confirmation_inscription/email_confirmation_inscription.html`](finales/email_confirmation_inscription/email_confirmation_inscription.html) | **finale (à relire)** | ajoutée 30/10 ; colonne 600 px ; « Confirmer mon adresse » → `page_email_confirme` ; expire 24 h ; lien de secours |
| E-mail : récap du lundi (2 états : changements / rien n'a changé) | [`finales/email_recap_lundi/email_recap_lundi.html`](finales/email_recap_lundi/email_recap_lundi.html) | **finale (à relire)** | ajoutée 30/10 ; sélecteur `#change` / `#inchange` absent en production ; note, delta, nouveaux constats, expiration SSL ; « Voir le rapport » → `page_rapport_hub` |

## Maquettes manquantes

| Page | Fichier | Statut | Remarque |
|---|---|---|---|
| Plafond atteint (2 sites / 1 lien) — le popup `interface_passer_pro` couvre peut-être ce cas, à confirmer | — | **manquante** | |
| Footer en maquette dédiée (réf. PNG dans `chrome/`) | — | **manquante** | |
| E-mail : confirmation d'inscription | — | **manquante** | |
| E-mail : réinitialisation du mot de passe | — | **manquante** | |
| E-mail : invitation équipe / demande d'accès | — | **manquante** | |
| E-mail : alerte (Pro, gelé) | — | **manquante** | |

## Chrome (nav, header, footer)

| Référence | Fichier | Statut |
|---|---|---|
| FOOTER-CANON-compact.md | [`chrome/FOOTER-CANON-compact.md`](chrome/FOOTER-CANON-compact.md) | référence |
| NAV-CANON-desktop-et-mobile.md | [`chrome/NAV-CANON-desktop-et-mobile.md`](chrome/NAV-CANON-desktop-et-mobile.md) | référence |
| chrome-footer-canon-light.png | [`chrome/chrome-footer-canon-light.png`](chrome/chrome-footer-canon-light.png) | référence |
| chrome-header-canon-light.png | [`chrome/chrome-header-canon-light.png`](chrome/chrome-header-canon-light.png) | référence |
| chrome-mobile-back-to-top.png | [`chrome/chrome-mobile-back-to-top.png`](chrome/chrome-mobile-back-to-top.png) | référence |
| chrome-mobile-bottom-nav.png | [`chrome/chrome-mobile-bottom-nav.png`](chrome/chrome-mobile-bottom-nav.png) | référence |
| chrome-mobile-top-bar.png | [`chrome/chrome-mobile-top-bar.png`](chrome/chrome-mobile-top-bar.png) | référence |

## Stitch

| Fichier | Statut |
|---|---|
| [`stitch/DESIGN-STITCH-RAPPORT-2026-10-28.md`](stitch/DESIGN-STITCH-RAPPORT-2026-10-28.md) | notes Stitch (couleurs Stitch ≠ tokens produit) |

## Archive

| Page | Fichier | Statut | Raison |
|---|---|---|---|
| Écran « Vérifiez votre e-mail » (magic link) | [`archive/page_lien_email_envoye/code.html`](archive/page_lien_email_envoye/code.html) | obsolète | magic link abandonné (29/10) ; peut servir de base à l'écran de confirmation d'e-mail |
| `page_rapport_restreint_exemple/` | — (dossier **vide** dans la source, non recopié) | obsolète | remplacé par le rapport adaptatif |

## Noms cités dans les anciens docs qui n'existent pas

`page_connexion`, `page_domaine_ouvert` (→ `page_rapport_domaine`), `page_domaine_verrouille` (→ `page_domaine_restreint`), `page_detail_constat` (→ `page_rapport_details`), `page_rapport_lecture`, `page_rapport_audit`, `interface_promptIA`, `interface_guide_correction`, `interface_verifier_propriete`, `interface_demande_acces` (→ `page_demande_acces`). Les correspondances entre parenthèses viennent de la vérification du 29/10.
