> **SNAPSHOT HISTORIQUE** (matin 28 oct) — chemins 
efs/ et DESIGN-STITCH-ARC-PURE cités ici ont été **archivés** le soir 28 oct sous docs/archive/audigy-titled-2026-10-28/. Ne pas traiter ce fichier comme inventaire actuel.

# Audit chrome Audixio — 2026-10-28


## Images référence transmises
PASS | chrome-header-canon-light.png (17599 o) — desktop header encadré
PASS | chrome-mobile-bottom-nav.png (7628 o) — mobile bottom sticky
PASS | chrome-mobile-top-bar.png (10107 o) — mobile top utils
PASS | chrome-footer-canon-light.png (37006 o) — footer compact
PASS | chrome-mobile-back-to-top.png (4963 o) — flèche remonter
INFO | 5 fichiers chrome-* dans assets/

## Règles chrome présentes
PASS | NAV-CANON-desktop-et-mobile.md: clés chrome OK
PASS | FOOTER-CANON-compact.md: clés chrome OK
PASS | 01-REGLES-STRICTES.md: clés chrome OK
PASS | workflow-Cursor-shell-pages-motion.md: clés chrome OK
PASS | restes-a-faire-par-page-Cursor.md: clés chrome OK
PASS | 02-chrome-ui.md: clés chrome OK
PASS | AGENTS.md: clés chrome OK
WARN | design.mdc: pas de renvoi NAV-CANON / PNG chrome mobile (résidu doc)

## Résidus problématiques (Cursor-facing)
FAIL | docs\design-pack-2026-10-26\08-MANIFEST.md:20 [JPG logo actif] | `assets/logo-icon.jpg` | 119671 | `0647215e7c1d395cbeafe12808a8f5799601c98ec67fdbc104fc561473ec0bf3` |
FAIL | docs\design-pack-2026-10-26\08-MANIFEST.md:21 [JPG logo actif] | `assets/logo-lockup.jpg` | 87242 | `01ac9fc0dc30b35ce6bc96c41aa6b9549e888472c7d6ad5b26356890f3b97977` |
FAIL | docs\design-pack-2026-10-26\FOOTER-CANON-compact.md:12 [copy 100% passif] | Sous marque | Une courte ligne factuelle (observatoire / indépendant) — **sans** inventer sondes, carbone, « 100 % pas
FAIL | docs\design-pack-2026-10-26\FOOTER-CANON-compact.md:23 [copy 100% passif] - « 100 % passif », réseau de sondes, e-mail inventé
FAIL | docs\etapes-refonte\04-promesse-et-copie.md:17 [copy 100% passif] 2. « **Passif par défaut…** » — supprimer « 100 % passif ».
FAIL | docs\design-pack-2026-10-26\maquettes\DESIGN-STITCH-ARC-PURE.md:231 [CTA Générer brief] - **Content**: Left side reports real-time summary counts (`4 constats · 2 Fix · 2 Vérif`); right side provides `[Génére
FAIL | docs\design-pack-2026-10-26\refs\audit-stitch-cursor-2026-10-26.md:26 [chemin tmp stitch5] - `/tmp/audigy-stitch5` lot final
FAIL | docs\design-pack-2026-10-26\refs\DESIGN-stitch-arc-pure.md:231 [CTA Générer brief] - **Content**: Left side reports real-time summary counts (`4 constats · 2 Fix · 2 Vérif`); right side provides `[Génére
FAIL | .cursor\rules\00-core.mdc:16 [JPG logo actif] - Logo unique : `docs/design-pack-2026-10-26/assets/logo-icon.jpg` + `logo-lockup.jpg`.
FAIL | .cursor\rules\00-core.mdc:16 [JPG logo actif] - Logo unique : `docs/design-pack-2026-10-26/assets/logo-icon.jpg` + `logo-lockup.jpg`.

## Marque Audigy restante (comptage)
INFO | docs\FONCTIONNEMENT.md: Audigy=1 Audixio=5
INFO | docs\design-pack-2026-10-26\01-REGLES-STRICTES.md: Audigy=1 Audixio=7
INFO | docs\design-pack-2026-10-26\05-LOGO.md: Audigy=1 Audixio=17
INFO | docs\design-pack-2026-10-26\07-PLUS-TARD.md: Audigy=1 Audixio=0
INFO | docs\design-pack-2026-10-26\08-MANIFEST.md: Audigy=1 Audixio=0
INFO | docs\design-pack-2026-10-26\journal-corrections-docs-2026-10-28.md: Audigy=1 Audixio=11
INFO | docs\design-pack-2026-10-26\couleurs-palette-et-phrases-Cursor.md: Audigy=1 Audixio=3
INFO | docs\design-pack-2026-10-26\workflow-Cursor-shell-pages-motion.md: Audigy=1 Audixio=7
INFO | docs\design-pack-2026-10-26\FOOTER-CANON-compact.md: Audigy=1 Audixio=4
INFO | docs\etapes-refonte\00-LISEZ-MOI.md: Audigy=2 Audixio=0
INFO | docs\design-pack-2026-10-26\maquettes\DESIGN-STITCH-ARC-PURE.md: Audigy=1 Audixio=0
INFO | docs\design-pack-2026-10-26\refs\audit-stitch-cursor-2026-10-26.md: Audigy=3 Audixio=0
INFO | docs\design-pack-2026-10-26\refs\bugs-a-reprendre-2026-11.md: Audigy=3 Audixio=0
INFO | docs\design-pack-2026-10-26\refs\dark-theme-tokens.md: Audigy=1 Audixio=0
INFO | docs\design-pack-2026-10-26\refs\DESIGN-stitch-arc-pure.md: Audigy=1 Audixio=0
INFO | docs\design-pack-2026-10-26\refs\reference-presentation-monscore-securite.md: Audigy=32 Audixio=0
INFO | .cursor\rules\00-core.mdc: Audigy=1 Audixio=0
INFO | .cursor\rules\security.mdc: Audigy=1 Audixio=0

## Chaque PNG cité dans les docs
PASS | cité: chrome-header-canon-light.png
PASS | cité: chrome-mobile-bottom-nav.png
PASS | cité: chrome-mobile-top-bar.png
PASS | cité: chrome-footer-canon-light.png
PASS | cité: chrome-mobile-back-to-top.png

## Cohérence mobile drawer vs sticky
INFO | NAV-CANON-desktop-et-mobile.md: drawer_mention=True sticky/bottom=True
INFO | 02-chrome-ui.md: drawer_mention=True sticky/bottom=True
INFO | AGENTS.md: drawer_mention=True sticky/bottom=True
INFO | 01-REGLES-STRICTES.md: drawer_mention=True sticky/bottom=True

## Manques optionnels (non bloquants)
WARN | Pas de PNG header desktop sombre
WARN | Pas de PNG top mobile thème clair dédié (top actuel = fond sombre)
WARN | Pas de PNG état Compte
WARN | design.mdc may lack NAV-CANON/FOOTER-CANON pointers
