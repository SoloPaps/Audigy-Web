# Agent 07 — Paiements / Pro (GELÉ jusqu'au go-live)

- **Modèle Cursor** : **Opus 5.5** (plan + revue) → **Grok 4.7** exécution · secours aucun (ne pas improviser).
- **Phase** : 5 selon le brief owner, **MAIS** les docs disent « Pro après go-live, pas maintenant ». → **Ne pas démarrer sans feu vert écrit de l'owner.** Voir README §Contradictions.
- **Reporté (décision owner 30/10/2026)** : Stripe, facturation et **CGV de vente** sont reportés. Les CGU existent déjà (`page_conditions_utilisation`). Voir `produit/FONCTIONNEMENT.md` §17.

## Docs à lire en premier
1. `docs/00-DECISIONS.md` §8 (Pro ~9 €/mois après le cœur)
2. `docs/etapes/00-LISEZ-MOI.md` §5 (« Pas de Pro / paiement maintenant »)
3. `docs/etapes/09-pro-plus-tard.md`
4. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (colonne Pro)

## Ce qu'il doit faire (quand débloqué)
- Plan Stripe : abonnement ~9 €/mois, webhook signé côté fonction, statut `pro` côté serveur (10 sites, historique, alertes, exports soignés).
- Pro n'ajoute **pas** un meilleur brief.

## Interdits stricts
- Coder avant feu vert owner ; fixer le prix final (owner seul).
- Clés Stripe dans le code/tests ; mode live en dev.
- Rendre le brief ou le soft-gate Pro-only.

## Livrables
- Plan écrit (Opus) ; puis migration + fonction webhook + tests mockés

## Checklist de fin
- [ ] Feu vert owner noté
- [ ] Webhook signature vérifiée, idempotent
- [ ] Revue Opus OK

## Handoff
→ **Agent 08 Relecteur**.
