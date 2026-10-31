# Audixio — Thème light Arc Soft

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.

**Ancre repo :** PR **#66**, commit `ef52ddbf` (si présent sur la branche — ne pas inventer le diff).  
**Source tokens Stitch :** `../archive/audigy-titled-2026-10-28/DESIGN-STITCH-ARC-PURE.md` (archive)  
**Stack narrative :** fusion MonScore × Arc Soft (`../archive/audigy-titled-2026-10-28/reference-presentation-monscore-securite.md` (archive)).

## Fond & atmosphère

| Token | Valeur | Usage |
|-------|--------|--------|
| Paper start (ivory) | `#EDE8F5` | Début dégradé page |
| Paper end (ice-blue) | `#ADBBDA` | Fin dégradé page |
| Surface solid | `#FFFFFF` | Fallback texte / cartes opaques |
| Surface glass | `rgba(255,255,255,0.64)` | Cartes frosted |
| Blur | `20px` (+ saturate ~140%) | Glass |
| Border ghost | `1px solid rgba(227,222,213,0.30)` | Contour glass |
| Line | `#ADBBDA` | Séparateurs |
| Shadow signature | `0 18px 48px rgba(27,31,36,0.10)` | Élévation unique |

## Blobs (décor uniquement — jamais sur texte/CTA)

| Blob | Hex |
|------|-----|
| Accent (ex-pétrole) | `#7091E6` |
| Bordure douce (ex-pêche) | `#ADBBDA` |
| Lilas | `#E3D4F0` |

Motion : dérive lente (~32 s), opacité douce — pas de shimmer AI-slop.

## Encre & marque

| Rôle | Hex |
|------|-----|
| Ink primary | `#1E2A55` |
| Ink secondary | `#4A5585` |
| Primary / accent | `#3D52A0` (CTA) ; container `#3D52A0` / `#3D52A0` selon DESIGN |
| On-primary | `#FFFFFF` |
| Focus ring | `#C2410C` (2px + offset 2px) |
| Secondary observ. | `#8697C4` |

## Statuts diagnostiques (AA)

| Niveau | Texte | Fond | Forme |
|--------|-------|------|-------|
| Bon A–B | `#067647` | `#ECFDF3` | Cercle |
| À améliorer C–D | `#B54708` | `#FFF6ED` | Triangle |
| Problème E–F | `#B42318` | `#FEF3F2` | Carré |
| Non testé | `#475467` | `#F2F4F7` | Cercle pointillé |

## Typo

- **Inter** — shell / UI chrome (gelé Cursor owner). Ne pas remplacer Inter du shell.
- **Outfit** — display / notes A–F (Arc Soft historique body ; ne pas remplacer Inter shell)
- **Atkinson Hyperlegible Next** — corps Arc Soft historique ; shell = Inter
- **JetBrains Mono** — code, URL, snippets ; `tabular-nums` sur scores

## Interdits light

- Violet AI-slop, emoji décoratifs, DSFR/Marianne, grille « cards-in-a-row » générique.
- Blobs utilisés comme couleur de bouton ou de texte.
