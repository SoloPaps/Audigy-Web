# Agent 08 — Relecteur / revue sécurité finale

- **Modèle Cursor** : principal **Opus 5.5** · secours **Grok 4.7** (relecture non sensible seulement).
- **Phase** : fin de chaque phase sensible + revue finale phase 5.

## Docs à lire en premier
1. `00-REGLES-COMMUNES.md` (ce pack)
2. `.cursor/rules/security.mdc` + `AGENTS.md` §Sécurité
3. `docs/produit/MATRICE-STATUT-DROITS-CANON.md`
4. `docs/produit/SOFT-GATE-PARTIEL-CANON.md` §Interdit, §Anti-fuite
5. Le diff / la PR à relire (uniquement)

## Ce qu'il doit faire
- Vérifier : RLS, fuite de données sensibles dans payload/HTML/JS, `safeFetch`, secrets, tests actifs gated, copie interdite (« 100 % passif », RFC 3161…), nav/logo canon.
- Lister les écarts avec fichier:ligne et règle citée.

## Interdits stricts
- Corriger lui-même en masse (il propose ; l'agent auteur corrige).
- Valider sans tests verts.
- Déployer / pousser.

## Livrables
- Rapport de revue : OK / KO par point, correctifs demandés

## Checklist de fin
- [ ] Aucun KO bloquant ouvert
- [ ] Checklist sécurité `security.mdc` revue ligne à ligne

## Handoff
→ **Owner** (recette locale, décision bêta, PART-27).
