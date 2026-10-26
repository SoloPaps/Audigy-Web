# Étape 05 — Rapport à deux couches

## Objectif

Verdict en haut (note, 3 priorités, français simple). Technique repliée. Brancher / corriger les bugs ouverts liés à la lecture du rapport.

## Fichiers à lire

- `docs/FONCTIONNEMENT.md` §1 et §3
- `docs/DESIGN.md` (lecture du rapport)
- `docs/design-pack-2026-10-26/02-PAGES.md` (Rapport)
- `docs/bugs-a-reprendre-2026-11.md` (items rapport / clarté)
- Composants rapport sous `apps/web/`

## À faire

1. Couche 1 toujours visible en premier.
2. Détail domaines / Comment corriger / brief : selon droits compte (voir étapes 06–07) ; structure UI prête.
3. Traiter les bugs rapport listés comme bloquants pour la clarté (ceux cochables maintenant ; le reste reste dans bugs-a-reprendre).
4. Liens `/methode` depuis constats catalogués conservés.

## Critères de done

- [ ] Particulier comprend la note + 3 priorités sans ouvrir le détail
- [ ] Technique accessible mais repliée par défaut
- [ ] Pas de barre de brief collée qui cache les constats
- [ ] Bugs P0 rapport traités ou explicitement reportés avec raison

## Interdits

- Exposer le détail faille en soft-gate / sans compte
- Refaire tout le moteur « pour le plaisir »
