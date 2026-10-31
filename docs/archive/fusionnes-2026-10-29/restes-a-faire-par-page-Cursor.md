# Restes Cursor par page (Audixio — gelé reviews 2026-10-27/28)

Complète `workflow-Cursor-shell-pages-motion.md` + `couleurs-palette-et-phrases-Cursor.md`.
Marque UI : **Audixio**. Logo : `logos/audixio-logos/out/` seulement.
Shell : Inter + tokens pétrole/pêche + nav/footer canon (`01-REGLES-STRICTES.md`).

## Header / footer canon (toutes pages)

- **Réf. layout :** [assets/chrome-header-canon-light.png](../../design/maquettes/chrome/chrome-header-canon-light.png) · [NAV-CANON-desktop-et-mobile.md](../../design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md)
- Forme : barre flottante **encadrée** ; liens au **milieu**
- **Mobile :** top utils + bottom sticky 4 icônes + flèche remonter — `NAV-CANON-desktop-et-mobile.md` / PNG `chrome-mobile-*`
- Flèche remonter : [`assets/chrome-mobile-back-to-top.png`](../../design/maquettes/chrome/chrome-mobile-back-to-top.png) (sticky bas-droit)
- Logo = lockup out/Audixio_PC_clair_h*.png (clair) / sombre — pas wordmark contour inventé

- Nav : **Accueil · Méthode · Sites suivis · Documentation** | FR/EN · thème · **Connexion** ou **Compte**
- Pas dans la nav : Pro, Progression, Bilan, Partage, Ressources, Offre santé, Dashboard, Audit actif, Générateur Brief
- Titre : **Audixio** seul (pas de tagline sous le nom)
- Footer shell : compact [`FOOTER-CANON-compact.md`](../../design/maquettes/chrome/FOOTER-CANON-compact.md) + [`assets/chrome-footer-canon-light.png`](../../design/maquettes/chrome/chrome-footer-canon-light.png) — Mentions · Confidentialité · Accessibilité · CGU · Audixio Pro · ©2026 · **V3.4** ; marque Audixio ; pas carbone inventé ; pas mega sitemap
- Remplacer header/footer Stitch par composants partagés
- E-mail légal historique : vérifier `FONCTIONNEMENT` / Mentions (ne pas inventer)

---

## États maquette ≠ état réel

Stitch montre souvent **démo connectée / Pro / sites remplis**.
**Défaut produit : anonyme, pas connecté, pas Pro.**
- Header : Connexion si déconnecté ; Compte seulement avec session.
- Pas de faux avatar connecté.
- Pro / courbes / historique long : seulement si Pro ; sinon empty states + plafonds gratuit.
- Coller la structure ; brancher les vrais états (détail : `couleurs-palette-et-phrases-Cursor.md`).

---

### Accueil — Stitch validé
- OK : passif · brief PARTIEL si compte non vérif / COMPLET si vérifié · Pro carte · soft-gate PARTIEL carte gratuit
- Cursor : logo · footer · éventuel doublon « Passif » · aligner descriptions **8 domaines** = Méthode · badge moteur allégé

### CGU — validé
- OK : horodaté (pas RFC) · export JSON portabilité · pas 24/7 · 2026
- Cursor : logo · retirer jargon résiduel non produit

### Connexion — validé
- OK : magic link · compte optionnel · pas « instantanée »
- Cursor : logo · Google = brancher ou « Bientôt »

### Déclaration accessibilité — validé (contenu)
- OK : audit non finalisé honnête · RGAA/WCAG · pas 24/7
- Cursor : logo · shell Accueil/Méthode/Sites/Doc · dates 2026 · pas faux « conforme »

### Guide correction (HSTS) — structure validée
- Cursor **important** : snippet **correct et distinct** par onglet hébergeur ; CTA « Vérifier après modification » branché ; CTA brief = **Copier le prompt pour votre assistant IA** (pas Générer)

### Méthode — Cursor porte le contenu si Stitch a dérivé
- 8 domaines · barème Bon 80–100 / À améliorer 50–79 / Problème 0–49 · **Non testé** (gris) 4e carte
- Brief = « Synthèse & Brief » selon matrice (PARTIEL / COMPLET) · pas « 100 % Open Source » → méthode transparente
- Pas sous-nav inventée · marque Audixio seulement

### Mentions légales — validé
- Cursor : dates 2026 · MIT seulement si vrai · logo · Copier adresse fonctionnel · Supabase Frankfurt OK si doc

### Confidentialité — validé
- Cursor : pas « captures horodatées » sauf si produit réel · claims crypto = vérifier code · libellé a11y honnête · export JSON branché

### Progression / diagnostic — validé
- OK : 403 WAF · Non testé · 8 domaines · passif · Interrompre
- Cursor : « scellement » → **horodaté** · retirer 48 sondes / souverain inventé · logo (pas ECG)

### Rapport (hub + domaines + brief) — lock-components (UX)
- **Canon maquettes :** `page_rapport_hub` / `page_domaine_ouvert` / `page_domaine_verrouille` / `page_brief_ia` / `page_detail_constat`.
- Compte non vérifié = soft-gate partiel + brief PARTIEL + composants Verrouillé ; vérifié = COMPLET.
- Hub : TOP 10 titres (pas 3 cartes détaillées) ; sélection sync domaine↔brief ; serveur capabilities.
- Soften locked teasers ; lettres A–F ; vie privée tests partiels HTTP/HTML (pas DDG / pas navigateur requis en bêta).

- OK : 8 domaines · Non testé · Rien/Vérif/Fix · Partager/Exporter · Pro waitlist
- Cursor : CTA floating **Copier le prompt…** + *Colle-le…* · libellés « partiel / automatique » vie privée · logo · footer · pas « Générer »

### Soft-gate PARTIEL (lien public) — à réaligner
- Soft-gate **partiel** (pas total) : détail ouverts + Verrouillé sensibles ; bandeau permanent ; noindex ; **aucun brief** ; pas de blur sur donnée existante.
- OK de base : CTA compte · vie privée partiel HTTP/HTML (domaine Verrouillé si soft-gate)
- Cursor : **masquer** Exporter/Partager lecteur public · durée **30 j** · Pro sans 24/7 ni certificats immuables · Vie privée partiel / automatique ≠ faux 95

### Sites suivis (gratuit) — validé
- OK : quotas **1/2 sites + 1/1 lien** · pas courbe · pas RFC/GSC · lien public Copier/Retirer 30 j · Exporter menu · Historique PRO · Pro « Me prévenir »
- Cursor : header **Compte** (page authentifiée ; sinon redirect/Connexion) · retirer claims inventés cartes · logo · Sites Pro (courbe) = plus tard

### Lien équipe — validé
- Destinataire sans compte · détail + brief lecture seule selon vérif proprio · **≠ soft-gate**
- Cursor : logo · Connexion header · footer · retirer CTAs owner (Copier lien, Partager ressources, Vérifier propriété, Revenir tableau…) · floating CTA = Copier le prompt… · figer Rien/Vérif/Fix lecture

### Mon compte — validé
- OK : GSC + CMS « Bientôt » · magic link · pas sièges · export JSON · danger zone · Pro Me prévenir
- Cursor : logo · adoucir jargon OAuth/§9 · export ≠ « historique complet » gratuit

### Vérifier propriété — validé (nits Cursor)
- Cursor : adoucir souverains/cryptographique/carbone/protocole officiel · succès = détail sensible / Comment corriger / brief COMPLET / partage débloqués (pas « tous droits gestion ») · un seul état UI · logo · `prefers-reduced-motion`

### Exemple de rapport — validé
- Cursor : logo/marque Audixio (pas Santé…) · ≥1000 px · id démo type AUD-DEMO · démo = soft-gate PARTIEL (ouverts + Verrouillé + pas brief anonyme)

### Demande d'accès — modale validée
- Fond = soft-gate **partiel** (ouverts visibles ; sensibles Verrouillé — **pas** blur CSS sur donnée existante) · e-mail* + message optionnel · Copier lien demande · En attente/Actualiser/Fermer · Accepter/Refuser via **page** (pas 1 clic mail)
- Cursor : pas Compte+avatar doublon · fond 8 domaines Méthode (pas inventés) · retirer Conforme souverain / Index maturité / carbone inventé footer

### Historique Pro — validé
- Courbe · badge PRO · Non testé · 8 domaines · Exporter
- Cursor : logo · pas « scellés/immuables » → horodaté · Sites Pro courbe hors lot gratuit

### 404 — validé owner
- H1 Page introuvable · CTA Accueil + Voir la méthode · pas form/claims inventés · shell canon · logo

### Pro waitlist — validé
- Hors nav · « Me prévenir » · pas 24/7

---

## Ordre agents (rappel)

1. Shell (logo Inter tokens nav footer)
2. 1 agent / page (HTML+PNG + nits de **cette** page ci-dessus)
3. Motion plus tard

Ne pas mettre à jour ce fichier à chaque micro-review sauf demande owner.


---

## Soft-gate partiel + lock-components (28 oct 2026 soir)

Canon : [`SOFT-GATE-PARTIEL-CANON.md`](../../produit/SOFT-GATE-PARTIEL-CANON.md) + **SSOT** [`MATRICE-STATUT-DROITS-CANON.md`](../../produit/MATRICE-STATUT-DROITS-CANON.md).

**Doctrine :** un design COMPLET (maquettes rapport 28 oct). **Pas** de hub Stitch PARTIEL séparé. Cursor code composants **Verrouillé** + capabilities serveur.

| Page / écran | Pourquoi | Qui | Priorité |
|---|---|---|---|
| Hub (`page_rapport_hub`) | Note + TOP 10 titres + 8 cartes + Brief hors page ; états locked | **Cursor** (structure Stitch + lock UI) | P0 |
| Domaine ouvert / verrouillé | Template Perf + pattern Sécurité Verrouillé ; soften teaser (pas HSTS/X-Frame) | Cursor | P0 |
| Brief (`page_brief_ia`) | Sélection sync + réglages prompt ; préfixes PARTIEL/COMPLET ; CTA compte | Cursor | P0 |
| Détail constat (`page_detail_constat`) | Fiche ; droits Comment corriger | Cursor | P1 |
| Lien public (≈ `page_exemple_rapport`) | Bandeau ; miroir partiel ; aucun brief | Cursor | P0 |
| Rapport lecture (`page_rapport_lecture`) | ≠ soft-gate ; brief lecture seule | Cursor | P1 |
| `page_rapport_audit` / `interface_promptIA` | **Legacy** — ne plus hub / préférer pages neuves | — | — |
| Demande d'accès / Vérifier / Accueil / Méthode | Copy + fond soft-gate partiel | Cursor | P1–P2 |

### Chrome — préférence owner (optionnelle)

NAV-CANON actuel = **canon**. Préférence owner évolutive : pastille « Audit rapide » + Méthode · Sites · Doc · Compte — **ne pas** remplacer le canon sans gel owner ; noter seulement ici.

**Recommandation :** P0 = Cursor implémente hub/domaines/brief + lock components + matrice. Pas d’attente d’un nouveau Stitch PARTIEL.

