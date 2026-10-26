# Audigy — thème sombre gelé (2026-10-26)

Références Stitch validées owner (« on fera ça comme thème ») :
- `dark-ref-accueil.png`
- `dark-ref-progression.png`

Nav / logo / item Progression / Blog-Actu → **Cursor** (pas Stitch).

## Tokens (extraits + unifiés pétrole Arc Soft)

| Rôle | Hex | Notes |
|------|-----|--------|
| Fond page | `#0F1620` → `#1A2332` | dégradé nuit ; glow radial pétrole léger au centre |
| Surface carte / glass | `#161E2C` / `rgba(22,30,44,0.78)` | border `rgba(255,255,255,0.10)` ; blur 16–24px |
| Encre primaire | `#F0F2F5` | titres, labels |
| Encre secondaire | `#9AA3B2` | sous-titres, meta |
| Primary / CTA | `#2A9B96` | pétrole ; texte sur CTA `#062220` |
| Primary hover | `#33B0AA` | |
| Accent succès (badge) | `#3DA165` | pastilles OK (Accueil) |
| Glow / focus | `#28908E` | Progression |
| Warn | `#E6B84D` texte / fond `#3A2F14` | |
| Bad | `#F0A0A0` texte / fond `#3A1A1A` | alertes (ref Accueil ~`#AD4F51`) |
| Outline | `rgba(255,255,255,0.12)` | |
| Header | glass sticky = surface | |
| CTA bandeau plein | `#226C6E` → préfère primary `#2A9B96` unifié | |

Interdit : violet AI-slop, noir plat `#000` plein écran, emoji décoratifs.
Contraste : texte primaire ≥ 4.5:1 ; statut jamais couleur seule.
