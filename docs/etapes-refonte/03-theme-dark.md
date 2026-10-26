# Étape 03 — Thème sombre gelé

## Objectif

Appliquer les tokens dark figés du pack ; toggle anti-FOUC ; refs PNG respectées.

## Fichiers à lire

- `docs/design-pack-2026-10-26/04-THEME-DARK.md`
- `docs/design-pack-2026-10-26/refs/dark-theme-tokens.md` (si présent)
- `docs/DESIGN.md` §2.4
- `apps/web/src/styles/tokens.css` (ou équivalent)
- PNG : `assets/dark-ref-accueil.png`, `assets/dark-ref-progression.png`

## À faire

1. Poser les tokens : fond `#0F1620`→`#1A2332`, surface `#161E2C`, encre `#F0F2F5`/`#9AA3B2`, CTA `#2A9B96`, etc.
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
