# Audigy — bugs & axes à reprendre (~novembre 2026)

Notés le **2026-10-25** (Europe/Paris). Pause owner ~1 mois. Reprise prévue autour du **25 nov. 2026**.

Contexte au moment de la pause : main à `cf9180b` (#54 brief), go-live (OVH + Netlify) encore à faire avec OK owner. Agent cloud `bc-c4472773…` annulé sans PR.

## Bugs ouverts (owner)

### 1. Design des cases à cocher (brief / constats)
Problème de design sur les contrôles pour cocher les constats (approche B brief).

### 2. Pastille Rien / Vérif / Fix mal alignée
La pastille bleue de sélection (Rien / Vérif / Fix) est décalée : elle apparaît au-dessus du cercle au lieu d’être centrée dedans. Visible sur la liste des constats du rapport (capture owner du 25 oct.).

### 3. Compteur de cases sélectionnées incorrect
Le nombre de cases sélectionnées ne marche pas (affichage / total faux ou qui ne suit pas les coches).

### 4. Prompt agent trop incomplet
Le brief / prompt généré à partir des constats cochés n’est pas assez complet (contenu à enrichir par rapport à la spec approche B validée).

**Renfort (note 25 oct.) :** injecter la **stack détectée** quand elle est connue (fingerprinting déjà là : en-têtes, retire.js, OSV/NVD) — ex. WordPress / Next / React — pour éviter des prompts trop génériques. Ne pas inventer une techno non détectée.

### 5. Rapport : infos trop entassées
Revoir le design du rapport : les infos sont entassées, lisibilité à améliorer (scannable, moins dense).

### 6. Flash / layout incorrect au premier affichage d’une page
Parfois, à l’accès d’une page, un bug de design s’affiche différemment (layout / styles incorrects) ; un **rafraîchissement** corrige. Suspect : FOUC / CSS / hydratation / theme-init — à investiguer.

### 7. Constats « vie privée » manquants
Sur le rapport, l’audit / les constats de la vie privée semblent manquer (ou incomplets) alors que d’autres domaines (courrier, DNS, page confidentialité, éco…) apparaissent.

## Axes d’amélioration (owner)

### A. Relancer un audit clairement
Pouvoir **redemander un audit** de façon explicite. Aujourd’hui, quand on refait un audit, le parcours ouvre encore l’**ancien rapport** — il faut ouvrir / suivre le **nouvel** audit (et ne pas réafficher l’ancien comme si c’était le résultat frais).

### B. Estimation de temps pendant l’analyse
Afficher une **estimation de temps** (durée restante ou fourchette) pendant que le site est en cours d’analyse (page progression / overlay).

### C. Liens sources / référentiels avec un beau design
Mettre des **liens soignés** (Arc Soft) vers les **sources** et ce sur quoi l’audit se base (méthode, référentiels type Observatory / Lighthouse / EcoIndex / etc.) — lisibles, unifiés, pas de liens « bruts » ou noyés dans le texte.

**Renfort (note 25 oct.) :** depuis chaque constat du rapport, lien / tooltip pédagogique vers la **section correspondante** de `docs/METHODE.md` / page `/methode` (« pourquoi cette règle »).

### D. Système de langue (max 3)
Ajouter un **sélecteur de langue** pour l’UI (et copies i18n). **Maximum 3 langues** au total — ex. français (défaut) + anglais + une 3ᵉ à choisir plus tard. Pas d’explosion i18n : rester léger, conserver les textes FR existants comme base.

## Axes d’amélioration (suggestions Jojo — owner OK pour les garder)

### E. Empty states & CTA « Relancer »
Sur historique / sites / rapport : empty states + bouton « Relancer un audit » bien visible (cohérent avec A).

### F. Progression plus parlante
En plus du temps estimé (B) : étapes nommées en clair (« DNS », « Pages », « Vie privée »…) et indicateur de ce qui est déjà fait vs en cours (libellés traduits via D).

### G. Page Méthode / sources en vitrine
Renforcer `/methode` (et pieds de rapport) comme vitrine des bases de l’audit : cartes / pastilles cliquables vers chaque référentiel, pas seulement une liste (lié à C + renfort liens par constat).

### H. Rapport emportable déjà là — polish densité
Vague 2 a livré PDF/Markdown/prompt : en reprendre le layout pour alléger la densité (lié au bug 5) et hiérarchiser score → priorités → détails.

### I. Sticky bar brief plus claire
Quand des constats sont cochés : sticky « Générer le brief » avec compteur fiable (lié bugs 1–3) et résumé court de la sélection.

### J. Accessibilité du sélecteur Rien / Vérif / Fix
Au-delà de l’alignement : focus visible, labels associés, taille de cible tactile correcte (mobile).

### K. Recette manuelle avant go-live
Toujours dans `docs/RECETTE.md` : NVDA/VoiceOver, Firefox, zoom 200 %, contraste, liens externes, security.txt, auto-audit prod.

## Notes d’archi — pistes « optimisation » (revue 2026-10-25)

Texte externe sur timeouts Netlify / prompts / METHODE / cache. Croisé avec `docs/PLAN.md` + `docs/METHODE.md` :

| # | Piste | Verdict Audigy |
|---|---|---|
| 1 | Timeouts Netlify Functions (10–26 s sync) | **Déjà blindé.** Audit toujours **asynchrone** : `audit-run-background` (≤ 15 min), statuts `queued`/`running`/`partial`/`done`, file SQL (`FOR UPDATE SKIP LOCKED`), pas Redis. Limite 1 audit / hôte / 15 min. Ne pas crawler depuis le navigateur. En prod : surveiller cold start / payload 256 Ko / quotas, pas la limite sync. |
| 2 | Prompts IA selon la stack détectée | **À pousser** → bug **4** (injecter fingerprinting existant dans le brief). |
| 3 | Liens / export preuves vers METHODE | **À pousser** → axes **C** + **G** (liens par constat vers la bonne section méthode). |
| 4 | Cache intelligent (ex. 1 h) | **Déjà en place.** Cache jour UTC (PSI/CrUX/OSV/NVD…), cooldown 15 min / hôte, OSV/NVD/KEV 24 h. Un TTL « 1 h » serait un réglage, pas une nouvelle brique — **non prioritaire** vs bugs UI. |

**À faire en reprise :** renforcer 2 et 3 seulement. Ne pas relancer une archi Redis / crawl navigateur pour le point 1.

## Hors bugs (go-live, inchangé)
1. Acheter `audigyweb.fr` chez OVH (OK owner).
2. Un seul deploy Netlify final (OK owner).
3. Recette manuelle puis auto-audit en prod.

## Fichier
Chemin agent store Jojo : `audigy/bugs-a-reprendre-2026-11.md`  
Routine rappel : « Audigy reprise bugs » — 25 nov. 2026 à 9h Europe/Paris.
