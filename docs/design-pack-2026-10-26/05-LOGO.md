# Audigy — Logo officiel

## Assets (dans ce pack)

| Fichier | Rôle | Taille approx. |
|---------|------|----------------|
| `assets/logo-icon.jpg` | Icône carré (favicon, avatar header compact, PWA) | ~117 Ko |
| `assets/logo-lockup.jpg` | Lockup horizontal (header desktop, splash) | ~85 Ko |

Sources owner (attachments agent 2026-10-26) — **seules** versions autorisées.

## Usages

| Contexte | Asset | Notes |
|----------|-------|-------|
| `AppHeader` desktop | `logo-lockup.jpg` (ou icon + wordmark texte si lockup trop large) | Hauteur ~28–36 px ; lien Accueil |
| Header / drawer mobile | `logo-icon.jpg` | Carré net |
| Favicon / apple-touch | dérivés de `logo-icon.jpg` | Générer PNG/ICO en build — pas Material |
| Empty states / loading | `logo-icon.jpg` | Opacité douce OK ; pas d’animation « ECG » |

## INTERDIT

- Material Symbols : `vital_signs`, `ecg_heart`, `graphic_eq`, `shield`, `verified`
- SVG « rythme cardiaque » / shield inventés
- Lettre **A** isolée comme marque
- Logos Stitch hétérogènes (901 material-symbols observés sur lot4 — à remplacer)

## Implémentation

```html
<!-- Exemple header -->
<a href="/" class="brand">
  <img src="/assets/brand/logo-lockup.jpg" alt="Audigy" width="140" height="36" />
</a>
```

Alt texte : **« Audigy »** (pas « logo » seul). Contraste du fond header glass light/dark : vérifier AA autour du JPG.
