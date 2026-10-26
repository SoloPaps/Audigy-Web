# Documentation

Index des documents du dépôt. Le statut du produit et le démarrage sont dans le [README](../README.md). Les règles pour les agents sont dans [AGENTS.md](../AGENTS.md) et dans `.cursor/rules/` (`00-core`, `design`, `security`, `stack`). Le chrome UI (nav, logo, sombre) suit le [pack design gelé](design-pack-2026-10-26/00-LISEZ-MOI.md).

## Documents de référence

| Fichier | À quoi il sert |
|---|---|
| [DESIGN.md](DESIGN.md) | Source de vérité UI clair : spec fusion MonScoreSécurité × Arc Soft (PR #66). Le sombre gelé est le §2.4. |
| [design-pack-2026-10-26/00-LISEZ-MOI.md](design-pack-2026-10-26/00-LISEZ-MOI.md) | Pack design gelé du 26 oct. 2026. Lire [01-REGLES-STRICTES.md](design-pack-2026-10-26/01-REGLES-STRICTES.md) avant toute UI. Pages : [02-PAGES.md](design-pack-2026-10-26/02-PAGES.md). Clair : [03](design-pack-2026-10-26/03-THEME-LIGHT-ARC-SOFT.md). Sombre : [04](design-pack-2026-10-26/04-THEME-DARK.md) + PNG `assets/dark-ref-*.png`. Logo : [05](design-pack-2026-10-26/05-LOGO.md). Backlog : [06](design-pack-2026-10-26/06-BACKLOG-CURSOR.md). Les copies `refs/bugs-a-reprendre-2026-11.md` et `refs/reference-presentation-monscore-securite.md` sont l’archive du pack ; les fichiers vivants restent [bugs-a-reprendre-2026-11.md](bugs-a-reprendre-2026-11.md) et [REFERENCE-AUDIGY-MONSCORE-FUSION.md](REFERENCE-AUDIGY-MONSCORE-FUSION.md). |
| [DEV-LOCAL.md](DEV-LOCAL.md) | Démarrage local : Supabase, labo, `netlify dev`, API, CLI, runner navigateur. Aucun déploiement. |
| [METHODE.md](METHODE.md) | Méthode de notation, version 2026.1. Une pondération nouvelle crée une version. |
| [PLAN.md](PLAN.md) | Produit, architecture, garde-fous §14, découpage PART-00 à PART-26, checklist de déploiement du propriétaire (section « PART-27 — Déploiement unique final »). |
| [QUESTIONS.md](QUESTIONS.md) | Questions ouvertes pour le propriétaire. Sans réponse, le défaut indiqué s’applique. |
| [REFERENCE-AUDIGY-MONSCORE-FUSION.md](REFERENCE-AUDIGY-MONSCORE-FUSION.md) | Cible produit ~novembre 2026 : fusion Audigy × MonScoreSécurité (briefs IA et Rien/Vérif/Fix conservés, lecture du rapport façon MonScore). État du 26 oct. : #61 et #62 sur `main` (§5). |
| [RECETTE.md](RECETTE.md) | Recette PART-26 du 24 octobre 2026, sur un build local. Ce n’est pas une mise en production. |
| [legal/registre.md](legal/registre.md) | Registre des traitements. La relecture humaine du propriétaire n’est pas faite. |
| [bugs-a-reprendre-2026-11.md](bugs-a-reprendre-2026-11.md) | Backlog bugs et axes à reprendre (novembre 2026). |

## Specs et plans d’interface

La source de vérité UI est [DESIGN.md](DESIGN.md). Les notes produit et d’expérience de la fusion restent dans [REFERENCE-AUDIGY-MONSCORE-FUSION.md](REFERENCE-AUDIGY-MONSCORE-FUSION.md). Les fichiers ci-dessous gardent les décisions historiques du propriétaire.

| Fichier | À quoi il sert |
|---|---|
| [superpowers/specs/2026-10-24-arc-soft-design.md](superpowers/specs/2026-10-24-arc-soft-design.md) | Direction visuelle Arc Soft. Présente sur `main` (#38, #39, #40). |
| [superpowers/plans/2026-10-24-arc-soft-redesign.md](superpowers/plans/2026-10-24-arc-soft-redesign.md) | Plan d’implémentation Arc Soft suivi pour les PR #38, #39 et #40. |
| [superpowers/specs/2026-10-24-ux-clarity-export-design.md](superpowers/specs/2026-10-24-ux-clarity-export-design.md) | Trois vagues de clarté et d’export, sur `main` : Vague 1 (#45), Vague 2 (#46), Vague 3 (#53). Suite (axe partiel, disponibilité, questionnaire, anglais) : #59, sur `main`. |
| [superpowers/specs/2026-10-24-agent-prompts-brief-design.md](superpowers/specs/2026-10-24-agent-prompts-brief-design.md) | Brief agent (approche B). Spec fusionnée (#47). L’interface est dans l’app. |
