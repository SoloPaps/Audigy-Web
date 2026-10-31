# Backlog design Audixio (fusion)

Fusion de `06-backlog-Cursor.md` (partie A) et `restes-a-faire-par-page-Cursor.md` (partie B). Originaux : `../archive/fusionnes-2026-10-29/`.

> **Mise à jour du 29/10/2026** — ces décisions priment (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Guide de correction = section « plan d'action » de la page détail (onglets CMS / code), une fiche par type de constat ; gains affichés seulement s'ils sont sourcés.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.
> - Noms de dossiers maquettes : les noms cités ici (ex. `page_rapport_audit`, `page_connexion`, `interface_guide_correction`) ne correspondent pas toujours aux dossiers réels → voir [`maquettes/INDEX.md`](maquettes/INDEX.md).

## Partie A — Backlog Cursor (chrome + pages)

Ordre : **shell → pages (1 agent / page) → motion**. Voir `workflow-Cursor-shell-pages-motion.md` + `05-LOGO.md` + `couleurs-palette-et-phrases-Cursor.md` + `06-BACKLOG.md` + `05-LOGO.md`.

### P0 — Shell (1 agent)

Mobile : top + bottom sticky + back-to-top — `NAV-CANON-desktop-et-mobile.md` + `assets/chrome-mobile-*.png`.


| ID | Tâche | DoD |
|----|-------|-----|
| P0.1 | AppHeader + footer partagés ([`FOOTER-CANON-compact.md`](maquettes/chrome/FOOTER-CANON-compact.md)) (layout [`NAV-CANON-desktop-et-mobile.md`](maquettes/chrome/NAV-CANON-desktop-et-mobile.md) + PNG canon) | Nav Accueil·Méthode·Sites suivis·Tarifs \| FR/EN · thème · Connexion/Compte ; footer Mentions·Conf·A11y·CGU·Pro·©2026·V3.4 |
| P0.2 | Purger nav interdite | Plus Audit actif / Historique / Générateur Brief / item Progression / Blog / bottom Diagnostic |
| P0.3 | Logo + Inter + tokens | Pack `logos/audixio-logos/out/` ; titre « Audixio » ; tokens **palette v2** (29/10 ; avant pétrole/pêche, `couleurs-palette-et-phrases-Cursor.md`) |
| P0.4 | Dark tokens + toggle | `04-THEME-DARK.md` ; anti-FOUC |
| P0.5 | Langues FR/EN (i18n, Cursor) — après le cœur, mais aucun texte en dur dès maintenant | [`etapes/11-i18n-langues.md`](../etapes/11-i18n-langues.md) : checklist de fin cochée |

### P1 — Pages (1 agent chacune)

Chaque agent reçoit `maquettes/<dossier>/code.html` + `screen.png` + nits copy + remap couleurs → tokens (`couleurs-palette-et-phrases-Cursor.md`).

Ordre suggéré : Accueil → Progression → Rapport audit → Soft/exemple → Lien équipe → Sites → Compte → Connexion (+ inscription, mot de passe) → Vérifier → Demande → Acceptation → Méthode → Pro → Historique → Éco → Guide → Brief modal → Légales → 404.

| ID | Dossier maquette | DoD |
|----|------------------|-----|
| P1.accueil | `page_accueil` | Body pixel-perfect + shell partagé |
| P1.progression | `page_progression` | idem |
| P1.rapport | `page_rapport_audit` | Note, 3 prio, Rien/Vérif/Fix, brief Copier prompt |
| P1.exemple | `page_exemple_rapport` | Démo / soft-gate **PARTIEL** (ouverts + Verrouillé) |
| P1.equipe | `page_rapport_lecture` | Lecture seule, pas CTAs owner |
| P1.sites | `page_site_suivi` | Quotas 2/1 |
| P1.compte | `page_compte` | |
| P1.connexion | `interface_connexion` | maquette faite 30/10 |
| P1.auth | connexion, inscription, mot de passe oublié, réinitialisation, confirmation d'e-mail | Connexion, inscription, mot de passe oublié, e-mail envoyé : **faites** (`interface_connexion`, 30/10) ; réinitialisation (`page_reinitialisation_mot_de_passe`) et e-mail confirmé (`page_email_confirme`) : **faites** (30/10) |
| P1.verifier | `page_verifier_propriete` | Page complète |
| P1.demande | `interface_demande_acces` | Modale |
| P1.accept | `page_acceptation_acces` | Page e-mail |
| P1.methode | `page_methode_bareme` | 8 domaines |
| P1.pro | `page_pro` | Waitlist |
| P1.histo | `pages_historique_monsite` | Pro |
| P1.eco | `page_ecologie` | |
| P1.guide | `interface_guide_correction` | |
| P1.brief | `interface_promptIA` | Modale |
| P1.legales | mentions / conf / CGU / a11y | |
| P1.404 | `page_404` | Title 404 correct |

### P2 — Motion (1 agent)

| ID | Tâche | DoD |
|----|-------|-----|
| P2.1 | Accueil / hero | Scroll léger type Attio/Lenis + lumières discrètes ; `prefers-reduced-motion` |
| P2.2 | Jauge / progression | Wow ciblé seulement |

### Hors backlog immédiat

Voir `07-PLUS-TARD.md` (GSC données, alertes Pro UI, pastille Accès partagés Sites optionnelle).


---

## Partie B — Restes à faire par page (gelé reviews 2026-10-27/28)

Complète `workflow-Cursor-shell-pages-motion.md` + `couleurs-palette-et-phrases-Cursor.md`.
Marque UI : **Audixio**. Logo : `logos/audixio-logos/out/` seulement.
Shell : Inter + tokens **palette v2** (29/10 ; avant pétrole/pêche) + nav/footer canon (`01-REGLES-STRICTES.md`).

### Header / footer canon (toutes pages)

- **Réf. layout :** [assets/chrome-header-canon-light.png](maquettes/chrome/chrome-header-canon-light.png) · [NAV-CANON-desktop-et-mobile.md](maquettes/chrome/NAV-CANON-desktop-et-mobile.md)
- Forme : barre flottante **encadrée** ; liens au **milieu**
- **Mobile :** top utils + bottom sticky 4 icônes + flèche remonter — `NAV-CANON-desktop-et-mobile.md` / PNG `chrome-mobile-*`
- Flèche remonter : [`assets/chrome-mobile-back-to-top.png`](maquettes/chrome/chrome-mobile-back-to-top.png) (sticky bas-droit)
- Logo = lockup out/Audixio_PC_clair_h*.png (clair) / sombre — pas wordmark contour inventé

- Nav : **Accueil · Méthode · Sites suivis · Tarifs** | FR/EN · thème · **Connexion** ou **Compte**
- Pas dans la nav : Pro, Progression, Bilan, Partage, Ressources, Offre santé, Dashboard, Audit actif, Générateur Brief
- Titre : **Audixio** seul (pas de tagline sous le nom)
- Footer shell : compact [`FOOTER-CANON-compact.md`](maquettes/chrome/FOOTER-CANON-compact.md) + [`assets/chrome-footer-canon-light.png`](maquettes/chrome/chrome-footer-canon-light.png) — Mentions · Confidentialité · Accessibilité · CGU · Audixio Pro · ©2026 · **V3.4** ; marque Audixio ; pas carbone inventé ; pas mega sitemap
- Remplacer header/footer Stitch par composants partagés
- E-mail légal historique : vérifier `FONCTIONNEMENT` / Mentions (ne pas inventer)

---

### États maquette ≠ état réel

Stitch montre souvent **démo connectée / Pro / sites remplis**.
**Défaut produit : anonyme, pas connecté, pas Pro.**
- Header : Connexion si déconnecté ; Compte seulement avec session.
- Pas de faux avatar connecté.
- Pro / courbes / historique long : seulement si Pro ; sinon empty states + plafonds gratuit.
- Coller la structure ; brancher les vrais états (détail : `couleurs-palette-et-phrases-Cursor.md`).

---

#### Accueil — Stitch validé
- OK : passif · brief PARTIEL si compte non vérif / COMPLET si vérifié · Pro carte · soft-gate PARTIEL carte gratuit
- Cursor : logo · footer · éventuel doublon « Passif » · aligner descriptions **8 domaines** = Méthode · badge moteur allégé

#### CGU — validé
- OK : horodaté (pas RFC) · export JSON portabilité · pas 24/7 · 2026
- Cursor : logo · retirer jargon résiduel non produit

#### Connexion — validé
- OK : compte optionnel · pas « instantanée »
- **Fait (30/10)** : `interface_connexion` — e-mail + mot de passe, Google, GitHub (plus de magic link) ; inscription et mot de passe oublié inclus
- Cursor : logo

#### Déclaration accessibilité — validé (contenu)
- OK : audit non finalisé honnête · RGAA/WCAG · pas 24/7
- Cursor : logo · shell Accueil/Méthode/Sites suivis/Tarifs · dates 2026 · pas faux « conforme »

#### Guide correction (HSTS) — structure validée
- Cursor **important** : snippet **correct et distinct** par onglet hébergeur ; CTA « Vérifier après modification » branché ; CTA brief = **Copier le prompt pour votre assistant IA** (pas Générer)

#### Méthode — Cursor porte le contenu si Stitch a dérivé
- 8 domaines · barème Bon 80–100 / À améliorer 50–79 / Problème 0–49 · **Non testé** (gris) 4e carte
- Brief = « Synthèse & Brief » selon matrice (PARTIEL / COMPLET) · pas « 100 % Open Source » → méthode transparente
- Pas sous-nav inventée · marque Audixio seulement

#### Mentions légales — validé
- Cursor : dates 2026 · MIT seulement si vrai · logo · Copier adresse fonctionnel · Supabase Frankfurt OK si doc

#### Confidentialité — validé
- Cursor : pas « captures horodatées » sauf si produit réel · claims crypto = vérifier code · libellé a11y honnête · export JSON branché

#### Progression / diagnostic — validé
- OK : 403 WAF · Non testé · 8 domaines · passif · Interrompre
- Cursor : « scellement » → **horodaté** · retirer 48 sondes / souverain inventé · logo (pas ECG)

#### Rapport (hub + domaines + brief) — lock-components (UX)
- **Canon maquettes :** `page_rapport_hub` / `page_domaine_ouvert` / `page_domaine_verrouille` / `page_brief_ia` / `page_detail_constat`.
- Compte non vérifié = soft-gate partiel + brief PARTIEL + composants Verrouillé ; vérifié = COMPLET.
- Hub : TOP 10 titres (pas 3 cartes détaillées) ; sélection sync domaine↔brief ; serveur capabilities.
- Soften locked teasers ; lettres A–F ; vie privée tests partiels HTTP/HTML (pas DDG / pas navigateur requis en bêta).

- OK : 8 domaines · Non testé · Rien/Vérif/Fix · Partager/Exporter · Pro waitlist
- Cursor : CTA floating **Copier le prompt…** + *Colle-le…* · libellés « partiel / automatique » vie privée · logo · footer · pas « Générer »

#### Soft-gate PARTIEL (lien public) — à réaligner
- Soft-gate **partiel** (pas total) : détail ouverts + Verrouillé sensibles ; bandeau permanent ; noindex ; **aucun brief** ; pas de blur sur donnée existante.
- OK de base : CTA compte · vie privée partiel HTTP/HTML (domaine Verrouillé si soft-gate)
- Cursor : **masquer** Exporter/Partager lecteur public · durée **30 j** · Pro sans 24/7 ni certificats immuables · Vie privée partiel / automatique ≠ faux 95

#### Sites suivis (gratuit) — validé
- OK : quotas **1/2 sites + 1/1 lien** · pas courbe · pas RFC/GSC · lien public Copier/Retirer 30 j · Exporter menu · Historique PRO · Pro « Me prévenir »
- Cursor : header **Compte** (page authentifiée ; sinon redirect/Connexion) · retirer claims inventés cartes · logo · Sites Pro (courbe) = plus tard

#### Lien équipe — validé
- Destinataire sans compte · détail + brief lecture seule selon vérif proprio · **≠ soft-gate**
- Cursor : logo · Connexion header · footer · retirer CTAs owner (Copier lien, Partager ressources, Vérifier propriété, Revenir tableau…) · floating CTA = Copier le prompt… · figer Rien/Vérif/Fix lecture

#### Mon compte — validé
- OK : CMS « Bientôt » · pas sièges · export JSON · danger zone · Pro Me prévenir
- Cursor : logo · **ajouter** sections mot de passe et comptes liés Google/GitHub + « Accès partagés » (29/10) · adoucir jargon OAuth/§9 · export ≠ « historique complet » gratuit

#### Vérifier propriété — validé (nits Cursor)
- Cursor : adoucir souverains/cryptographique/carbone/protocole officiel · succès = détail sensible / Comment corriger / brief COMPLET / partage débloqués (pas « tous droits gestion ») · un seul état UI · logo · `prefers-reduced-motion`

#### Exemple de rapport — validé
- Cursor : logo/marque Audixio (pas Santé…) · ≥1000 px · id démo type AUD-DEMO · démo = soft-gate PARTIEL (ouverts + Verrouillé + pas brief anonyme)

#### Demande d'accès — modale validée
- Fond = soft-gate **partiel** (ouverts visibles ; sensibles Verrouillé — **pas** blur CSS sur donnée existante) · e-mail* + message optionnel · Copier lien demande · En attente/Actualiser/Fermer · Accepter/Refuser via **page** (pas 1 clic mail)
- Cursor : pas Compte+avatar doublon · fond 8 domaines Méthode (pas inventés) · retirer Conforme souverain / Index maturité / carbone inventé footer

#### Historique Pro — validé
- Courbe · badge PRO · Non testé · 8 domaines · Exporter
- Cursor : logo · pas « scellés/immuables » → horodaté · Sites Pro courbe hors lot gratuit

#### 404 — validé owner
- H1 Page introuvable · CTA Accueil + Voir la méthode · pas form/claims inventés · shell canon · logo

#### Pro waitlist — validé
- Hors nav · « Me prévenir » · pas 24/7

---

### Ordre agents (rappel)

1. Shell (logo Inter tokens nav footer)
2. 1 agent / page (HTML+PNG + nits de **cette** page ci-dessus)
3. Motion plus tard

Ne pas mettre à jour ce fichier à chaque micro-review sauf demande owner.


---

### Soft-gate partiel + lock-components (28 oct 2026 soir)

Canon : [`SOFT-GATE-PARTIEL-CANON.md`](../produit/SOFT-GATE-PARTIEL-CANON.md) + **SSOT** [`MATRICE-STATUT-DROITS-CANON.md`](../produit/MATRICE-STATUT-DROITS-CANON.md).

**Doctrine :** un design COMPLET (maquettes rapport 28 oct). **Pas** de hub Stitch PARTIEL séparé. Cursor code composants **Verrouillé** + capabilities serveur.

| Page / écran | Pourquoi | Qui | Priorité |
|---|---|---|---|
| Hub (`page_rapport_hub`) | Note + TOP 10 titres + 8 cartes + Brief hors page ; états locked | **Cursor** (structure Stitch + lock UI) | P0 |
| Domaine ouvert / verrouillé | Template Perf + pattern Sécurité Verrouillé ; soften teaser (**29/10 : les pastilles HTTPS / HSTS / X-Frame restent**) | Cursor | P0 |
| Brief (`page_brief_ia`) | Sélection sync + réglages prompt ; préfixes PARTIEL/COMPLET ; CTA compte | Cursor | P0 |
| Détail constat (`page_detail_constat`) | Fiche ; droits Comment corriger | Cursor | P1 |
| Lien public (≈ `page_exemple_rapport`) | Bandeau ; miroir partiel ; aucun brief | Cursor | P0 |
| Rapport lecture (`page_rapport_lecture`) | ≠ soft-gate ; brief lecture seule | Cursor | P1 |
| `page_rapport_audit` / `interface_promptIA` | **Legacy** — ne plus hub / préférer pages neuves | — | — |
| Demande d'accès / Vérifier / Accueil / Méthode | Copy + fond soft-gate partiel | Cursor | P1–P2 |

#### Chrome — préférence owner (optionnelle)

NAV-CANON actuel = **canon**. Préférence owner évolutive : pastille « Audit rapide » + Méthode · Sites suivis · Tarifs (→ `page_pro`) · Compte — **ne pas** remplacer le canon sans gel owner ; noter seulement ici.

**Recommandation :** P0 = Cursor implémente hub/domaines/brief + lock components + matrice. Pas d’attente d’un nouveau Stitch PARTIEL.


