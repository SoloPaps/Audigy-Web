# Audixio — Pages & écrans (canon D+M)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Guide de correction = section « plan d'action » de la page détail (onglets CMS / code), une fiche par type de constat ; gains affichés seulement s'ils sont sourcés.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).

> **En conflit chrome / copy / marque / domaines / soft-gate / droits :** `01-REGLES-STRICTES.md` + `docs/produit/FONCTIONNEMENT.md` + `SOFT-GATE-PARTIEL-CANON.md` + **`MATRICE-STATUT-DROITS-CANON.md`** + `couleurs-palette-et-phrases-Cursor.md` **gagnent**.


> **Correspondance dossiers (30/10/2026)** — les noms ci-dessous remplacent les anciens noms encore cités plus bas (historique) : `page_domaine_ouvert` → `page_rapport_domaine` · `page_domaine_verrouille` → `page_domaine_restreint` · `page_detail_constat` → `page_rapport_details` · `page_connexion` → `interface_connexion` · `interface_demande_acces` → `page_demande_acces` · `interface_guide_correction` → `page_plan_action`. Liste complète et à jour des dossiers `finales/` : [`maquettes/INDEX.md`](maquettes/INDEX.md). Routes app ↔ maquettes :
>
> | Route | Maquette |
> |---|---|
> | `/` | `page_accueil` |
> | `/connexion` (+ inscription, mot de passe oublié) | `interface_connexion` |
> | `/mot-de-passe/reinitialiser` | `page_reinitialisation_mot_de_passe` |
> | `/email-confirme` | `page_email_confirme` |
> | `/bienvenue` | `page_bienvenue` |
> | `/audit/:id/progression` | `page_progression` |
> | `/audit/:id/echec` | `page_audit_echoue` |
> | `/rapport/:id` | `page_rapport_hub` |
> | `/rapport/:id/:domaine` | `page_rapport_domaine` / `page_domaine_restreint` |
> | `/rapport/:id/constat/:check` | `page_rapport_details` |
> | `/rapport/:id/brief` | `page_brief_ia` |
> | `/rapport/:id/plan` | `page_plan_action` |
> | `/rapport/:id/pdf` | `page_rapport_pdf` |
> | `/exemple` | `page_exemple_rapport` |
> | `/sites` | `page_site_suivi` (état vide : `page_sites_suivis_vide`) |
> | `/sites/:id/verifier` | `page_verifier_propriete` |
> | `/sites/:id/historique` (Pro, gelé) | `pages_historique_monsite` |
> | `/acces/demande` · `/acces/:token` | `page_demande_acces` · `page_acceptation_acces` |
> | `/compte` | `page_compte` |
> | `/compte/alertes` | `page_reglages_alertes` |
> | `/pro` | `page_pro` (nav Tarifs + CTA Pro ; comparatif Gratuit vs Pro + liste d'attente) · popup `interface_passer_pro` = limite atteinte seulement |
> | `/methode` · `/ecoconception` · `/robot` | `page_methode_bareme` · `page_ecologie` · `page_robot_audixio` |
> | `/mentions-legales` · `/confidentialite` · `/cgu` · `/accessibilite` · `/cookies` | pages légales homonymes · `interface_bandeau_cookies` |
> | 404 · 500 · maintenance | `page_404` · `page_500` · `page_maintenance` |
> | (modale) partage du badge | `interface_badge_partage` |
> | (modale) partager le rapport | `interface_partager` (mobile + `navigator.share` : feuille native ; sinon / desktop : modale) |
>
> Les routes sont **proposées** (à confirmer par Cursor dans `apps/web`) ; la colonne maquette fait foi.

**Base maquettes :** `docs/design/maquettes/` — dossiers `page_*` et `interface_*` (voir [`maquettes/INDEX.md`](maquettes/INDEX.md)).  
**Anciens dossiers `audigy_*` et chemins `/tmp/audigy-stitch5` : retirés — ne plus les citer.**  
**Règle :** 1 desktop canon par dossier (`screen.png` + `code.html`) ; body = pixel-perfect structure/spacing/cartes/CTA ; couleurs = tokens ; chrome = `01-REGLES-STRICTES.md`.  
**Domaines CANON :** `docs/produit/FONCTIONNEMENT.md` §2 (8 domaines ; Disponibilité / Réputation hors note ; Search Console facultatif, pas 9ᵉ).

---

## 1. Accueil

| | |
|--|--|
| **Objectif** | Entrée wow + confiance : URL → audit gratuit sans compte |
| **Canon** | `page_accueil/` |
| **Dark** | Appliquer tokens `04` ; ref visuelle `assets/dark-ref-accueil.png` |

### Checklist OBLIGATOIRE

- [ ] Hero + champ URL + CTA primaire « Lancer l’audit »
- [ ] **8 domaines CANON** (pas 6 ; pas Disponibilité ni Search Console dans la note) : Performance · SEO · Sécurité · Écologie · Accessibilité · Qualité technique · Vie privée · DNS / e-mail — voir `FONCTIONNEMENT.md` §2
- [ ] **3 liens** : Comment ça marche · Voir un exemple de rapport · Guide pour corriger
- [ ] Skip link « Aller au formulaire d’audit »
- [ ] Nav canon + logos `logos/audixio-logos/out/` (pas Material, pas JPG legacy)
- [ ] Micro-garanties : « Passif par défaut… » (pas « 100 % passif ») ; icônes Lucide, pas emoji

---

## 2. Rapport d’audit (canon 28 oct soir)

| | |
|--|--|
| **Objectif** | Hub verdict + domaines + brief ; droits via `MATRICE-STATUT-DROITS-CANON.md` |
| **Hub** | `page_rapport_hub/` — note + TOP 10 titres + 8 cartes + CTA Brief hors page |
| **Domaine ouvert** | `page_domaine_ouvert/` (template Perf) |
| **Domaine verrouillé** | `page_domaine_verrouille/` (template Sécurité — pattern Verrouillé) |
| **Brief / prompt** | `page_brief_ia/` (sélection sync + réglages prompt + aperçu/générer/copier) |
| **Détail constat** | `page_detail_constat/` |
| **Legacy** | `page_rapport_audit/` — ne plus prendre comme hub |
| **Lien équipe** | `page_rapport_lecture/` (lecture seule — ≠ soft-gate) |
| **Exemple / démo** | `page_exemple_rapport/` |
| **Brief modale legacy** | `interface_promptIA/` — préférer page `page_brief_ia/` |
| **Guide correction** | `interface_guide_correction/` |

### Doctrine UI

- **Un design = COMPLET** (maquettes hub/domaine/brief). Manque de droits → **composants Verrouillé**, pas une 2ᵉ maquette PARTIEL.
- Serveur = capabilities ; **jamais** findings sensibles dans le client locked.
- Mock Stitch = démo ; adoucir aperçus locked (pas HSTS/X-Frame). Scores UI = **lettres A–F** (pas /100 comme système).

### Checklist OBLIGATOIRE

- [ ] Hub : note + **TOP 10** priorités (**titre seul**, clic → domaine#ancre) + **8 cartes** + Brief CTA **hors page** — **pas** 3 priorités détaillées sur le hub
- [ ] Non vérifié : note `partielle · N domaines · site non vérifié` + globale cadenas ; 1–2 priorités ouvertes + teaser sensible + CTA Vérifier
- [ ] Vérifié : note globale A–F (+ label) ; domaines ouverts
- [ ] Tri-état **Rien / Vérif / Fix** sur **domaine et Brief** (source sync unique) ; sensibles seulement si capability OK
- [ ] **8 domaines CANON** ; A11y B1 (zéro claim RGAA/EAA) ; Sécurité/Vie privée/DNS = **Verrouillé** si non autorisé — matrice + `SOFT-GATE-PARTIEL-CANON.md`
- [ ] Filtres domaine **Tous / À corriger / Succès**
- [ ] Brief selon matrice : anonyme=CTA compte ; non vérif=**PARTIEL** ; vérifié=**COMPLET** ; public=aucun ; équipe=lecture seule ; CTA **Copier le prompt…** ; « votre assistant IA »
- [ ] Brief page : réglages prompt (ton/stack…) + aperçu / générer / copier ; domaine peut garder copier unitaire
- [ ] Comment corriger **branché site** seulement si vérifié ; guides génériques OK
- [ ] Export base OK compte même non vérifié (matrice) ; ne pas exiger compte si déjà vérifié
- [ ] Soft-gate PARTIEL ≠ lien équipe
- [ ] Nav canon (jamais famille B)

---

## 3. Progression (OK + 403)

| | |
|--|--|
| **Objectif** | Flux d’audit rassurant + état accès partiel / WAF 403 |
| **Canon** | `page_progression/` |
| **Dark** | Ref `assets/dark-ref-progression.png` |

### Checklist OBLIGATOIRE

- [ ] Étapes nommées (pas logs bruts)
- [ ] État **403** / WAF / accès partiel visible
- [ ] **SANS** item Progression dans la nav globale
- [ ] Nav canon + logos `logos/audixio-logos/out/`

---

## 4. Connexion

| | |
|--|--|
| **Canon** | `interface_connexion/` (vues connexion, inscription, mot de passe oublié, e-mail envoyé — 30/10) |
| **Confirmation d'e-mail** | vue « e-mail envoyé » dans `interface_connexion` ; l'ancien écran magic link reste archivé (`maquettes/archive/page_lien_email_envoye/`, historique) |

### Checklist

- [ ] Formulaire connexion : e-mail + mot de passe, Google, GitHub ; liens « Créer un compte » et « Mot de passe oublié »
- [ ] Pas de bottom-bar Diagnostic… — mobile = bottom sticky canon (`NAV-CANON`)
- [ ] Nav canon (défaut non connecté = **Connexion**)

---

## 5. Vérifier la propriété

| | |
|--|--|
| **Canon page** | `page_verifier_propriete/` |
| **Variante UI** | `interface_verifier_propriete/` |

### Checklist

- [ ] Parcours preuve de propriété — **immédiat** : fichier + balise meta + lien HTML ; **vague suivante** : DNS TXT/CNAME ; **plus tard** : OAuth hébergeur / Search Console-like
- [ ] Mobile = bottom sticky + top utils (`NAV-CANON`)

---

## 6. Questionnaire éco RGESN

| | |
|--|--|
| **Canon** | `page_ecologie/` |

### Checklist

- [ ] Questions pratiques RGESN hors scan
- [ ] Nav canon

---

## 7. Guide de correction

| | |
|--|--|
| **Canon** | `interface_guide_correction/` (modale / UI) |

### Checklist

- [ ] Étapes + états de vérification
- [ ] Nav / chrome = composants partagés

---

## 8. Soft-gate (rapport partagé public)

| | |
|--|--|
| **Maquette** | Pas de dossier soft-gate dédié — démo structure ≈ `page_exemple_rapport/` ; écarts produit = `06-BACKLOG.md` + `couleurs-palette-et-phrases-Cursor.md` §B.4 |
| **≠** | Lien équipe = `page_rapport_lecture/` (détail + brief lecture seule) |
| **Demande d’accès** | `interface_demande_acces/` (modale) |

### Checklist

- [ ] Soft-gate **PARTIEL** : détail Perf/SEO/Éco/Qualité + A11y B1 ; Sécurité/Vie privée/DNS = badge Verrouillé (pas A–F) ; données sensibles absentes payload
- [ ] Note `partielle · N domaines · site non vérifié` + globale cadenas ; hub TOP 10 / teasers selon matrice
- [ ] **Bandeau permanent** lien public + `noindex, nofollow`
- [ ] **Aucun brief** sur lien public / anonyme ; masquer Exporter / Partager / Relancer côté lecteur
- [ ] Copie lien, opt-out, CTA compte (ou Vérifier si owner non vérifié)
- [ ] Soft-gate = gratuit (pas « Soft-gating Pro »)
- [ ] Vie privée bêta/local = tests partiels HTTP/HTML libellés « partiel / automatique » (pas DDG, pas navigateur requis) ; domaine Verrouillé si soft-gate ; pas faux A–F
- [ ] Anti-fuite : pas de blur CSS sur donnée existante — `SOFT-GATE-PARTIEL-CANON.md`
- [ ] Nav canon

---

## 9. Méthode / barème

| | |
|--|--|
| **Canon** | `page_methode_bareme/` |

### Checklist

- [ ] Barème public + « ce qu’on ne fait jamais »
- [ ] **8 domaines CANON** uniquement (`FONCTIONNEMENT.md` §2)
- [ ] Nav canon (Connexion par défaut ; Compte si session)

---

## 10. Sites suivis

| | |
|--|--|
| **Canon** | `page_site_suivi/` |
| **Historique Pro** | `pages_historique_monsite/` (Pro seulement) |

### Checklist

- [ ] **Sites suivis** (pas « Tableau de bord »)
- [ ] Quotas gratuit : **2 sites / 1 lien** actif
- [ ] Gratuit = pas de courbe (courbes = Pro)
- [ ] Header **Compte** car page authentifiée ; empty/redirect si anonyme
- [ ] Nav canon
- [ ] Multi-sites+GSC données = hors scope (`07-PLUS-TARD.md`)

---

## 11. Compte / contact

| | |
|--|--|
| **Canon** | `page_compte/` |

### Checklist

- [ ] Infos compte / contact
- [ ] **Pas** multi-sites+GSC dans ce lot
- [ ] Nav canon (Compte si session)

---

## 12. Mentions légales

| | |
|--|--|
| **Canon** | `page_mentions_legales/` |

### Checklist

- [ ] Contenu légal ; nav canon D+M

---

## 13. Politique de confidentialité

| | |
|--|--|
| **Canon** | `page_politique_confidentialite/` |

### Checklist

- [ ] Contenu ; nav canon

---

## 14. Déclaration d’accessibilité

| | |
|--|--|
| **Canon** | `page_accessibilite/` |

### Checklist

- [ ] Contenu ; nav canon

---

## 15. Conditions d’utilisation (CGU)

| | |
|--|--|
| **Canon** | `page_conditions_utilisation/` |

### Checklist

- [ ] Contenu ; nav canon

---

## 16. Autres écrans INDEX

| Dossier | Usage |
|---------|--------|
| `page_rapport_hub/` | Hub rapport (canon) |
| `page_domaine_ouvert/` | Domaine ouvert template |
| `page_domaine_verrouille/` | Domaine Verrouillé template |
| `page_brief_ia/` | Brief / config prompt |
| `page_detail_constat/` | Détail constat |
| `page_pro/` | Audixio Pro : comparatif Gratuit/Pro (ré-audit, alertes, SSL, plafonds) + liste d'attente |
| `page_bienvenue/` | Bienvenue (v2 30/10) : hero doux, frise 3 étapes, checklist ; « Lancer mon premier audit » → `page_accueil#audit-form`, « Plus tard » → `page_sites_suivis_vide`. Affichée une seule fois à la 1re connexion OAuth (Google/GitHub) ; inscription e-mail → `page_email_confirme` ; « Plus tard » = jamais réaffichée |
| `page_404/` | 404 |
| `page_acceptation_acces/` | Acceptation propriétaire (page) |
| `interface_demande_acces/` | Demande d’accès (modale soft-gate) |

### E-mails

Gabarit commun : colonne centrée 600 px, mise en page simple (CSS à inliner à l'envoi), Inter + repli, palette v2 claire, logo en en-tête, pied avec Audixio@outlook.fr, préférences / désabonnement → `page_reglages_alertes`, mentions légales. Français uniquement, pas de barre de navigation.

| Dossier | Usage |
|---------|--------|
| `email_confirmation_inscription/` | Bienvenue + « Confirmer mon adresse » → `page_email_confirme` ; expiration 24 h ; lien de secours en texte |
| `email_recap_lundi/` | Récap hebdo, 2 états (`#change` : note, delta, nouveaux constats, SSL ; `#inchange` : rappel des résultats) ; CTA « Voir le rapport » → `page_rapport_hub` |

---

## Inventaire

Voir [`maquettes/INDEX.md`](maquettes/INDEX.md) pour la liste complète `page_*` / `interface_*`.  
**Ne plus citer** les anciens dossiers `audigy_*` ni `/tmp/audigy-stitch5`.
