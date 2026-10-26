# Audigy — Thème light Arc Soft

**Ancre repo :** PR **#66**, commit `ef52ddbf` (si présent sur la branche — ne pas inventer le diff).  
**Source tokens Stitch :** `refs/DESIGN-stitch-arc-pure.md`  
**Stack narrative :** fusion MonScore × Arc Soft (`refs/reference-presentation-monscore-securite.md`).

## Fond & atmosphère

| Token | Valeur | Usage |
|-------|--------|--------|
| Paper start (ivory) | `#FAF8F4` | Début dégradé page |
| Paper end (ice-blue) | `#D7E7F2` | Fin dégradé page |
| Surface solid | `#FFFFFF` | Fallback texte / cartes opaques |
| Surface glass | `rgba(255,255,255,0.64)` | Cartes frosted |
| Blur | `20px` (+ saturate ~140%) | Glass |
| Border ghost | `1px solid rgba(227,222,213,0.30)` | Contour glass |
| Line | `#E3DED5` | Séparateurs |
| Shadow signature | `0 18px 48px rgba(27,31,36,0.10)` | Élévation unique |

## Blobs (décor uniquement — jamais sur texte/CTA)

| Blob | Hex |
|------|-----|
| Pétrole / teal | `#9FCFCB` |
| Pêche | `#F3C7B4` |
| Lilas | `#E3D4F0` |

Motion : dérive lente (~32 s), opacité douce — pas de shimmer AI-slop.

## Encre & marque

| Rôle | Hex |
|------|-----|
| Ink primary | `#1B1F24` |
| Ink secondary | `#4A5260` |
| Primary / accent pétrole | `#0F5C5A` (CTA) ; container `#004342` / `#0f5c5a` selon DESIGN |
| On-primary | `#FFFFFF` |
| Focus ring | `#C2410C` (2px + offset 2px) |
| Secondary observ. | `#1F5FAD` |

## Statuts diagnostiques (AA)

| Niveau | Texte | Fond | Forme |
|--------|-------|------|-------|
| Bon A–B | `#1F5FAD` | `#E6EEF8` | Cercle |
| À améliorer C–D | `#9A5800` | `#FBF0DE` | Triangle |
| Problème E–F | `#B3261E` | `#FBE7E5` | Carré |
| Non testé | `#5F6672` | `#F1F1EF` | Cercle pointillé |

## Typo

- **Outfit** — display / notes A–F
- **Atkinson Hyperlegible Next** — UI & corps
- **JetBrains Mono** — code, URL, snippets ; `tabular-nums` sur scores

## Interdits light

- Violet AI-slop, emoji décoratifs, DSFR/Marianne, grille « cards-in-a-row » générique.
- Blobs utilisés comme couleur de bouton ou de texte.
