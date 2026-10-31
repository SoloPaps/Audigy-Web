# Backlog Cursor (chrome + pages)

Ordre : **shell → pages (1 agent / page) → motion**. Voir `workflow-Cursor-shell-pages-motion.md` + `logos-Audixio-mode-emploi-Cursor.md` + `couleurs-palette-et-phrases-Cursor.md` + `restes-a-faire-par-page-Cursor.md` + `05-LOGO.md`.

## P0 — Shell (1 agent)

Mobile : top + bottom sticky + back-to-top — `NAV-CANON-desktop-et-mobile.md` + `assets/chrome-mobile-*.png`.


| ID | Tâche | DoD |
|----|-------|-----|
| P0.1 | AppHeader + footer partagés ([`FOOTER-CANON-compact.md`](../../design/maquettes/chrome/FOOTER-CANON-compact.md)) (layout [`NAV-CANON-desktop-et-mobile.md`](../../design/maquettes/chrome/NAV-CANON-desktop-et-mobile.md) + PNG canon) | Nav Accueil·Méthode·Sites·Doc \| FR/EN · thème · Connexion/Compte ; footer Mentions·Conf·A11y·CGU·Pro·©2026·V3.4 |
| P0.2 | Purger nav interdite | Plus Audit actif / Historique / Générateur Brief / item Progression / Blog / bottom Diagnostic |
| P0.3 | Logo + Inter + tokens | Pack `logos/audixio-logos/out/` ; titre « Audixio » ; tokens pétrole/pêche (`couleurs-palette-et-phrases-Cursor.md`) |
| P0.4 | Dark tokens + toggle | `04-THEME-DARK.md` ; anti-FOUC |

## P1 — Pages (1 agent chacune)

Chaque agent reçoit `maquettes/<dossier>/code.html` + `screen.png` + nits copy + remap couleurs → tokens (`couleurs-palette-et-phrases-Cursor.md`).

Ordre suggéré : Accueil → Progression → Rapport audit → Soft/exemple → Lien équipe → Sites → Compte → Connexion → Magic → Vérifier → Demande → Acceptation → Méthode → Pro → Historique → Éco → Guide → Brief modal → Légales → 404.

| ID | Dossier maquette | DoD |
|----|------------------|-----|
| P1.accueil | `page_accueil` | Body pixel-perfect + shell partagé |
| P1.progression | `page_progression` | idem |
| P1.rapport | `page_rapport_audit` | Note, 3 prio, Rien/Vérif/Fix, brief Copier prompt |
| P1.exemple | `page_exemple_rapport` | Démo / soft-gate **PARTIEL** (ouverts + Verrouillé) |
| P1.equipe | `page_rapport_lecture` | Lecture seule, pas CTAs owner |
| P1.sites | `page_site_suivi` | Quotas 2/1 |
| P1.compte | `page_compte` | |
| P1.connexion | `page_connexion` | |
| P1.magic | `page_lien_email_envoye` | |
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

## P2 — Motion (1 agent)

| ID | Tâche | DoD |
|----|-------|-----|
| P2.1 | Accueil / hero | Scroll léger type Attio/Lenis + lumières discrètes ; `prefers-reduced-motion` |
| P2.2 | Jauge / progression | Wow ciblé seulement |

## Hors backlog immédiat

Voir `07-PLUS-TARD.md` (GSC données, alertes Pro UI, pastille Accès partagés Sites optionnelle).
