# Étape 08 — Export

## Objectif

Export **rapport de base** (PDF / MD) gratuit avec compte. Séparer clairement du futur export client Pro.

## Fichiers à lire

- `docs/FONCTIONNEMENT.md` §5 et §6
- Spec / code export existant (vagues UX)
- `docs/DESIGN.md` (si contraintes export)

## À faire

1. Export PDF/MD basique pour compte gratuit.
2. Contenu = rapport utile, sans fioritures Pro (pas de logo client soigné, pas de comparaison multi-audits).
3. Sans compte : pas d’export (ou uniquement ce qui est déjà décidé — par défaut **non**).
4. Préparer les points d’extension Pro (sans les coder) : logo, comparaison, signature.

## Critères de done

- [ ] Export basique disponible avec compte
- [ ] Fichiers générés lisibles ; pas de secret / chemin serveur fuité
- [ ] UI ne promet pas l’export Pro

## Interdits

- Excel/CSV Pro maintenant
- Faire passer l’export gratuit pour un livrable « agence » complet
