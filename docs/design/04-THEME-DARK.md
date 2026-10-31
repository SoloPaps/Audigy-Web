# Audixio — Thème sombre (figé owner 2026-10-26)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.

**Références visuelles validées (« on fera ça comme thème ») :**

- `assets/dark-ref-accueil.png`
- `assets/dark-ref-progression.png`

**Tokens source :** `../archive/audigy-titled-2026-10-28/dark-theme-tokens.md` (archive) (copie ci-dessous unifiée).

Nav / logo / item Progression / Blog-Actu → **Cursor**, pas Stitch.

## Tokens

| Rôle | Hex / valeur | Notes |
|------|--------------|--------|
| Fond page | `#0B1021` → `#1E2A55` | Dégradé nuit ; glow radial accent léger au centre |
| Surface carte / glass | `#161E2C` / `rgba(22,30,44,0.78)` | Border `rgba(255,255,255,0.10)` ; blur 16–24px |
| Encre primaire | `#F0F2F5` | Titres, labels |
| Encre secondaire | `#9AA3B2` | Sous-titres, meta |
| Primary / CTA | `#7091E6` | Accent ; texte sur CTA `#0B1021` |
| Primary hover | `#ADBBDA` | |
| Accent succès (badge) | `#3DA165` | Pastilles OK (Accueil) |
| Glow / focus | `#7091E6` | Progression |
| Warn | texte `#E6B84D` / fond `#3A2F14` | |
| Bad | texte `#F0A0A0` / fond `#3A1A1A` | Alertes (ref Accueil ~`#AD4F51`) |
| Outline | `rgba(255,255,255,0.12)` | |
| Header | glass sticky = surface | |
| CTA bandeau plein | préférer primary `#7091E6` (unifié vs `#3D52A0`) | |

## Toggle anti-FOUC

1. Script **inline** dans `<head>` avant CSS async : lit `localStorage` (préférer `audixio-theme` ; lecture rétrocompat `audigy-theme` OK) + `prefers-color-scheme`.
2. Pose `class="dark"` (ou `data-theme="dark"`) sur `<html>` **avant** premier paint.
3. CSS : variables light par défaut ; `.dark` / `[data-theme=dark]` surcharge.
4. Bouton thème dans `AppHeader` (pas un item nav) — accessible, `aria-pressed`.

## Interdits dark

- Violet AI-slop, noir plat `#000` plein écran, emoji décoratifs.
- Contraste : texte primaire ≥ 4,5:1 ; statut jamais couleur seule.
- Ne **pas** réintroduire une maquette Stitch « dark rapport » lot3 comme source — owner a figé Accueil + Progression PNG.
