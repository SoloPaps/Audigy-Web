# Produit cible : Audigy × MonScoreSécurité (le meilleur des deux)

> **Décisions historiques d’octobre 2026** — contenu conservé (#61 / #62). Ce n’est plus la source de vérité produit : voir [`FONCTIONNEMENT.md`](FONCTIONNEMENT.md). Charte : [`DESIGN.md`](DESIGN.md) et le [pack design](design-pack-2026-10-26/00-LISEZ-MOI.md).

**Date :** 26 octobre 2026 (Europe/Paris)  
**État :** 26 octobre 2026 — #61 et #62 sont sur `main` (merge #61 `9e2ea2e0`, #62 `87e14b7e`). Méthodo never/self et opt-out PublicScore livrés. Clés `home.guarantees.*`, `priorities.*`, `report.grade.*` : dictionnaires seulement. La cible ci-dessous ne change pas. Détail en §5.  
**Intention owner :** ne pas seulement *présenter* Audigy comme MonScore — **fusionner** les deux : garder tout ce qu’Audigy a de fort (prompts IA, sélection des corrections, multi-domaines, Arc Soft…) et prendre le **maximum** de l’UX / pédagogie / parcours MonScore.  
**Livrable :** référence pour ~novembre 2026 (rappel routine 26 nov 9h).  
**Sources MonScore :** [home](https://monscoresecurite.fr/), [méthodo](https://monscoresecurite.fr/methodologie) v1.5, [pricing](https://monscoresecurite.fr/pricing), [à propos](https://monscoresecurite.fr/a-propos), rapport [angelique-osteo](https://monscoresecurite.fr/rapport/owvrR361EUK5OKxQwRLs2g) + captures Jojo.  
**Sources Audigy :** produit actuel SoloPaps/Audigy-Web (brief agent PR #47/#49/#54, triage #57–#59, Arc Soft, 26 PART, domaines MDN Observatory / Lighthouse-CrUX / EcoIndex-RGESN / axe / etc.).  
**Chrome UI (gelé 2026-10-26) :** la nav, le logo et le thème sombre ne se déduisent pas de MonScore ni d’une nouvelle maquette Stitch. Source : [`design-pack-2026-10-26/01-REGLES-STRICTES.md`](design-pack-2026-10-26/01-REGLES-STRICTES.md). Le clair Arc Soft de la fusion (PR #66) reste dans [`DESIGN.md`](DESIGN.md). Le sombre est [`DESIGN.md`](DESIGN.md) §2.4.

---

## 0. Vision en une phrase

> **Audigy reste le moteur multi-domaines + assistant de correction (briefs IA, coches, Vérif/Fix)** ;  
> **MonScore dicte la façon dont un humain comprend et agit** (note claire → 3 priorités → guide → re-vérif), sans inscription jusqu’au premier rapport.

---

## 1. Matrice « garder / emprunter / fusionner »

### 1.1 À garder d’Audigy (non négociable)

| Capacité Audigy | Pourquoi c’est mieux / unique |
|---|---|
| **Multi-domaines** (sécu, perf/CrUX, a11y/axe-RGAA, éco/RGESN, vie privée/trackers, dispo, stack…) | MonScore = surtout sécu site + questionnaire ; Audigy couvre le site « complet » |
| **Brief agent / prompts IA** (approche B) : coches multi-constats, sticky « Générer le brief », brief riche Cursor+chat ancré référentiels (NIST / checks) | MonScore a des guides manuels hébergeur, pas de brief agent |
| **Par constat : Rien / Vérif / Fix** (+ voie rapide sans terminal ; bloc terminal optionnel groupé) | Contrôle fin de ce qu’on veut corriger — cœur différenciant |
| **Export / historique / multi-sites** (Vague UX) | Pro MonScore a historique ; Audigy peut égaler + lier aux briefs |
| **Design Arc Soft** (wow, glass, motion, spring) | MonScore est sobre navy/rouge ; Audigy peut être spectaculaire *sur le marketing*, rapport reste lisible |
| **i18n** (FR + EN…) | MonScore FR-first |
| **Référentiels explicites par domaine** (Observatory, Lighthouse, EcoIndex, OSV…) | Transparence technique déjà dans l’ADN Audigy |
| **Pipeline PART / moteur** | Largeur de couverture |

### 1.2 À emprunter à MonScore (maximum utile)

| Pattern MonScore | Où le coller dans Audigy |
|---|---|
| Hero : question + délai + livrables + 3 garanties + champ URL **sans compte** | Accueil |
| **Self-audit publié** (se noter soi-même avec défauts) | Page preuve / footer |
| **Méthodo publique** = barème du code + « ce qu’on ne fait jamais » | `/methode` (déjà P2.3) à enrichir façon MSS |
| Note **lettre + label + /100 + phrase humaine** | En-tête rapport (tous domaines → note globale synthétique) |
| **Exactement 3 priorités** en tête (impératif, pourquoi, durée, difficulté, qui) | Au-dessus de tout le détail multi-domaines |
| Modale **Comment corriger** : étapes + snippet copiable + avertissement + « Vérifier après » | En plus du brief IA (pas à la place) |
| Gating soft : score visible, détail sensible Pro / masqué sur lien public | Partage rapport |
| Méta **durée · difficulté · qui** sur chaque action | Sur priorités + dans le brief |
| Lead email optionnel + alerte surveillance | Post-rapport |
| Opt-out « c’est mon site, retirer le rapport » | Confiance partage |
| Questionnaire **pratiques** (hors scan technique) | Optionnel : hygiène (sauvegardes, mots de passe…) que le scan ne voit pas |
| Guides **par hébergeur** (sélecteur Netlify / OVH /…) | Pour findings DNS/headers où un paste DNS suffit |

### 1.3 Fusion produit (le cœur)

```
┌─────────────────────────────────────────────────────────┐
│  NOTE GLOBALE (lettre + /100 + phrase)                  │
│  + 3 PRIORITÉS (style MonScore)                         │
│       └─ Comment corriger (guide rapide)                │
│       └─ [ ] Inclure dans le brief IA                   │
├─────────────────────────────────────────────────────────┤
│  SÉLECTION (Audigy)                                     │
│  Coches multi-constats · Rien / Vérif / Fix par ligne   │
│  Sticky « Générer le brief » → prompt Cursor/chat       │
├─────────────────────────────────────────────────────────┤
│  DÉTAIL PAR DOMAINE (Audigy largeur)                    │
│  Accordion scores · badges Important/Mineur             │
│  Gating Pro soft sur le très technique                  │
└─────────────────────────────────────────────────────────┘
```

**Règle d’or :** le brief IA et le chooser Rien/Vérif/Fix restent ; la *première lecture* du rapport doit pouvoir se faire sans eux, comme chez MonScore (3 actions claires). Les prompts IA sont le **turbo pour le prestataire / power user**, pas le seul chemin.

---

## 2. Parcours cible fusionné

```
1. Accueil (Arc Soft wow)
   → Champ URL, « Réponse en ~X min », garanties (méthodo / passif ou borné / données)
   → Sans inscription

2. Analyse (étapes humaines, pas logs)
   → Domaines Audigy en parallèle / progressif

3. Rapport public
   a. Note globale + phrase
   b. 3 priorités (durée, difficulté, qui) + Comment corriger
   c. Bandeau : « Corriger avec un assistant » → active la zone sélection / brief
   d. Sélection constats (Rien/Vérif/Fix) + Générer brief
   e. Détail par domaine / test (accordéons)
   f. Email / PDF / partager / relancer / surveillance

4. Après correction
   → Relancer analyse (comme « Vérifier après correction »)
   → Historique d’évolution (Pro)
```

Voies parallèles (comme aujourd’hui Audigy, clarifiées) :
- **Voie rapide** : 3 priorités + guides → corriger sans brief  
- **Voie agent** : cocher → Générer brief → Cursor / chat  
- **Voie terminal** : Vérif/Fix groupés dans le brief (spec déjà validée)

---

## 3. Spécification écran par écran (cible)

### 3.1 Home
- Emprunt MSS : H1 question, délai, livrables (note + 3 priorités + brief prestataire), micro-garanties, mockup **vrai** rapport Audigy (self-score).  
- Emprunt Audigy : Arc Soft, mention multi-domaines en une ligne (« sécurité, vitesse, accessibilité, écoconception… »).  
- Ne pas noyer le hero avec 26 PART.

### 3.2 Rapport — zone haute (MonScore)
- Lettre + label + /100 + synthèse (« 2 réglages importants, tous faciles »).  
- Disclaimer honnête (limites passives / pas un audit certifié PASSI).  
- Relancer · PDF résumé · (Pro) PDF complet.

### 3.3 Trois priorités (MonScore) + pont vers Audigy
Chaque carte :
1. Titre impératif  
2. Pourquoi (1 phrase métier)  
3. Durée · Difficulté · Qui  
4. Boutons : **Comment corriger** | **Ajouter au brief** (pré-coche le constat)

Les 3 priorités sont choisies par un ranking cross-domaines (impact × facilité × poids), pas « les 3 premiers de la sécu ».

### 3.4 Zone brief IA (Audigy — à mettre en avant, pas en bas oublié)
- Liste coches de tous les constats (ou filtrée Important).  
- Par ligne : **Rien | Vérif | Fix** (défaut intelligent selon type).  
- Sticky **Générer le brief** → contenu validé (rôle, site, constats, référentiels, attendu, garde-fous, terminal optionnel).  
- Copier / ouvrir dans Cursor.  
- Compteur « N constats · M Fix · K Vérif ».

### 3.5 Comment corriger (MonScore → Audigy)
Pour findings « paste config » (DMARC, SPF, headers, redirect…) :
- Modale étapes + sélecteur hébergeur + snippet domaine + avertissement + Vérifier après.  
Pour findings « code / stack » :
- Le guide court pointe vers **Générer le brief (Fix)** plutôt qu’un faux tutoriel DNS.  
→ Le meilleur des deux : guide humain *ou* brief agent selon la nature du constat.

### 3.6 Détail multi-domaines (Audigy)
- Une section par domaine avec score /100 et phrase.  
- Badges Important / Mineur.  
- Accordéon findings.  
- Lien « voir dans la méthodo » (axes déjà notés triage).  
- Soft Pro sur détails sensibles (chemins fichiers, versions exactes) si rapport partagé.

### 3.7 Confiance & méthodo
- Page méthodo publique (poids, plafonds, hors-scope) style MSS.  
- « Ce qu’on ne fait jamais » (pas de pentest non demandé, etc.).  
- Self-rapport Audigy.  
- Sources listées par domaine (pas un jargon unique OWASP si Observatory est la ref sécu).

### 3.8 Offre (esprit MSS, contenu Audigy)
- Gratuit : note + 3 priorités + détail partiel + brief limité (ex. 1 brief / N constats).  
- Pro : tous domaines détail, briefs illimités, PDF, historique, multi-sites, surveillance.  
- Gating soft : jamais cacher la note.

---

## 4. Ce que « le meilleur site » refuse

- Choisir MonScore *ou* Audigy : on **compose**.  
- Remplacer les prompts IA par de seuls guides hébergeur.  
- Remplacer les 3 priorités + phrases humaines par un dashboard de 40 findings.  
- Forcer un compte avant le premier rapport.  
- Un brief illisible (pavé) : même exigence de clarté que les priorités MSS.  
- Design wow qui casse le scan du rapport (Arc Soft = shell ; rapport = hiérarchie stricte).

---

## 5. Checklist de convergence (à cocher en nov. 2026)

### État 26 oct 2026

#61 et #62 sont sur `main`.

- Merge #61 `9e2ea2e041dd7cf4b0825c45888adeb4f24e7599` : méthodo, score public, dictionnaires.
- Merge #62 `87e14b7e91636d01ed2ddc94bfd971b8382be143` : cet état, rédigé alors que #61 n’était pas encore décrit comme fusionné.

AI Studio avait importé le dépôt ; après #60 il ne proposait qu’un force-push vers `main`. Reprise par export zip, puis #61. Pas de force-push.

**Livré sur `main` (#61) :**
- `/methode` : « Ce que nous ne faisons jamais » + « Transparence et auto-audit », et le sommaire (`methode.astro`). Clés `method.never.*`, `method.self.*`.
- Score public (`PublicScore.svelte`) : bloc propriétaire, connexion pour gérer, masquer ou retirer. Clés `score.public.optout.*` dans `fr.ts` et `dictionnaire-en.json`.

**Dictionnaires seulement (pas d’écran) :**
- `home.guarantees.*` — délai, gratuit, passif. Pas de bandeau à l’accueil.
- `priorities.*` — 3 priorités, durée, difficulté, qui, Comment corriger, pont vers le brief, `why.*`. Pas de cartes, pas de modale.
- `report.grade.*` — lettre + label /100. Pas d’en-tête de note.

**Hors #61 :** bugs moteur et fiabilité du triage d’octobre 2026 (document retiré, travail clos). Fusion encore ouverte : ranking des 3 priorités, modales Comment corriger, en-tête de note, bandeau de garanties.

**Présentation (MSS)**
- [ ] Note lettre + label + /100 + phrase — clés `report.grade.*` seulement, pas d’en-tête
- [ ] 3 priorités cross-domaines avec durée / difficulté / qui — clés `priorities.*` seulement, pas de ranking ni de cartes
- [ ] Comment corriger (guide) là où ça a du sens — libellés dans `priorities.*`, pas de modale
- [ ] Sans compte jusqu’au rapport
- [x] Méthodo publique + self-audit — livré sur `main` (#61) : sections + sommaire
- [x] Opt-out propriétaire (gérer / masquer / retirer) — livré sur `main` (#61, `PublicScore`)
- [ ] Gating soft
- [ ] Bandeau de garanties à l’accueil — clés `home.guarantees.*` seulement

**Puissance (Audigy)**
- [ ] Coches + Rien/Vérif/Fix + Générer brief (sticky)
- [ ] Brief ancré référentiels + voies Cursor/chat/terminal
- [ ] Multi-domaines visibles sans écraser les 3 priorités
- [ ] Relancer / historique / export
- [ ] Arc Soft home + rapport scannable
- [ ] Pont « Ajouter au brief » depuis chaque priorité — libellé dans `priorities.*`, pas branché

**Fusion**
- [ ] Chaque finding Important a *au moins* : pourquoi + (guide **ou** Fix brief)
- [ ] Ranking des 3 priorités documenté
- [ ] Copy FR « vous », jargon glosé

---

## 6. Annexe A — Analyse MonScore (détail observé)

### Design
- Header sticky navy `#2B4166`, CTA rouge `#DC2626`, accent cyan, bleu action `#2563EB`, vert OK `#16A34A`, orange Important.  
- Typo type DM Sans ; rapport colonne ~450 px ; cartes 8–12 px radius.  
- Home aérée ; rapport compact ; chat flottant ; footer dense.

### Fonctionnement
- 10 tests passifs, poids total 105, note A–F, plafonds critique/important, zéro faux positif, une cause une pénalité.  
- Questionnaire 40 Q / 8 domaines (express 10).  
- Gratuit / ~39 € PDF / Pro 9 €/mois.

### Rapport (angelique-osteo B 86/100)
- Synthèse + Relancer + PDF.  
- 3 priorités (ex. DMARC) + Comment corriger.  
- Lead email optionnel.  
- Détail 10 tests ; emails 6/100 avec badges ; Pro sur détails sensibles.  
- Opt-out retrait rapport.

### Modale DMARC
- Fournisseur · 4 étapes · `v=DMARC1; p=reject; sp=reject` · warnings · Vérifier après.

### Captures Jojo
Préfixe : `/cursor/stores/store-4510d518-1831-424a-8d4b-8050224da295/grok-bot/agents/db9b0a40-1156-4cee-b56a-927255ff1837/attachments/`  
- Hero `61ac14bc…png` · Rapport note B `124608b0…png` · 3 priorités `63e9f233…png` · Modale DMARC `1e94c7f4…png` · Détail tests `19335afa…png`

### Non vu côté MSS
Espace Pro, PDF complet, message prestataire exact, options sélecteur hébergeur.

---

## 7. Annexe B — Inventaire Audigy à préserver

- Moteur multi-PART (26 PART, pas 27).  
- Sécu passive type MDN HTTP Observatory (pas « OWASP » comme label principal).  
- Perf Lighthouse/CrUX ; éco EcoIndex/RGESN ; deps retire.js/OSV ; trackers Tracker Radar ; a11y axe/RGAA ; disponibilité ; questionnaire RGESN.  
- Spec brief agent (approche B) : [`archive/superpowers/`](archive/README.md) (ancien `docs/superpowers/`, 2026-10-24) — implémenté via vagues PR.  
- UX post-Arc Soft : textes scannables, liens unifiés.  
- Owner : autonome hors argent / comptes / secrets / Netlify deploy.  
- Backlog polish nov : `audigy/bugs-a-reprendre-2026-11.md`.

---

## 8. Prochaine utilisation

1. Rouvrir ce fichier (rappel 26 nov).  
2. Cocher §5 sur le rapport Audigy live.  
3. Prioriser les écarts : (1) 3 priorités + phrase note, (2) pont priorités → brief, (3) Comment corriger pour findings DNS/config, (4) polish Arc Soft sans casser la hiérarchie. La méthodo, l’auto-audit et l’opt-out du score public sont sur `main` (#61). Les clés accueil / priorités / note ne comptent pas tant que l’écran n’existe pas.  
4. Ne pas ouvrir de PR design non demandée avant feu owner ; ce doc = cible produit, pas ticket immédiat.

---

*Jojo pour Papi_Dratix — référence fusion Audigy × MonScoreSécurité.*
