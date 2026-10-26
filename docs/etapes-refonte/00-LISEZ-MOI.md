# Étapes de refonte Audigy — lire en premier

Ordre global pour modifier le site **comme décidé** le 26 octobre 2026. Une étape à la fois. Pas de déploiement.

## Prérequis

- Repo local : `SoloPaps/Audigy-Web` déjà cloné chez l’owner (ce pack ne clone pas).
- Pack design sur `main` : `docs/design-pack-2026-10-26/`.
- Quota Cursor faible (~1 % au 26 oct. ; renouvellement ~**20 novembre 2026**) → privilégier Gemini / Gemini AI Studio pour la rédaction longue si besoin ; Cursor pour le code ciblé quand le quota revient.
- Lire `docs/FONCTIONNEMENT.md` (après étape 01) avant toute feature produit.

## Ordre

| # | Fichier | Sujet |
|---|---|---|
| 01 | `01-fondations-docs.md` | Merger ce pack docs |
| 02 | `02-chrome-ui.md` | AppHeader, logo, i18n, drawer |
| 03 | `03-theme-dark.md` | Tokens dark gelés |
| 04 | `04-promesse-et-copie.md` | 5 corrections + 8 domaines |
| 05 | `05-rapport-deux-couches.md` | Verdict / technique ; bugs |
| 06 | `06-compte-et-plafonds.md` | Magic link, 2 sites, 1 lien |
| 07 | `07-partage-soft-gate.md` | Liens, soft-gate, table |
| 08 | `08-export.md` | Export gratuit basique |
| 09 | `09-pro-plus-tard.md` | Pro après go-live seulement |
| 10 | `10-recette-et-lancement.md` | Option C, LICENSE, PART-27 |

## Interdits communs à toutes les étapes

- `netlify deploy`, liaison Git Netlify, deploy previews
- Relancer Stitch
- Inventer des features hors `FONCTIONNEMENT.md`
- GitHub Actions comme navigateur de service public
- Tests actifs sur site non vérifié
- `git push` sans demande explicite owner

## Critère global de done (refonte)

Chaque étape a ses critères. La refonte « gratuite go-live ready » = étapes **01→08** + **10** (hors Pro). L’étape **09** reste documentée, pas codée avant go-live.
