# Étape 03 — Thème sombre gelé

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.

## Objectif

Appliquer les tokens dark figés du pack ; toggle anti-FOUC ; refs PNG respectées.

## Fichiers à lire

- `docs/design/04-THEME-DARK.md`
- `docs/archive/audigy-titled-2026-10-28/dark-theme-tokens.md` (si présent)
- `docs/design/DESIGN.md` §2.4
- `apps/web/src/styles/tokens.css` (ou équivalent)
- PNG : `assets/dark-ref-accueil.png`, `assets/dark-ref-progression.png`

## À faire

1. Poser les tokens : fond `#0B1021`→`#1E2A55`, surface `#161E2C`, encre `#F0F2F5`/`#9AA3B2`, CTA `#7091E6`, etc.
2. Pas de violet AI-slop, pas de `#000` plein écran.
3. Toggle thème : pas un item de navigation ; anti-FOUC.
4. Vérifier pages clés vs PNG de référence (proche, pas pixel-perfect).

## Critères de done

- [ ] Tokens dark uniquement depuis les sources gelées
- [ ] Clair Arc Soft non réécrit
- [ ] Toggle OK sans flash indésirable
- [ ] `prefers-reduced-motion` respecté

## Interdits

- Inventer une nouvelle palette sombre
- Relancer Stitch pour le dark
