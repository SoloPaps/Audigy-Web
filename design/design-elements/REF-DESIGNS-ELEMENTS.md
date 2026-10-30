# REF — Designs des éléments (Audixio)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../../00-DECISIONS.md)) :
> - Palette **v2** = référence couleurs (`design/design-elements/palette-foundations-v2.*` : boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`). Les couleurs pétrole / pêche (teal) de ce fichier sont **remplacées**.

Règle : pour chaque design, adapter les couleurs à la **palette v2 (boutons `#3D52A0` survol `#1E2A55`, accent `#7091E6`, secondaire `#8697C4`, bordures `#ADBBDA`, surfaces `#EDE8F5`, texte `#1E2A55` / `#4A5585`)**. Pas de vert, pas de teal ni de pêche (ancienne palette) des démos.
Quand Cursor pose les couleurs : pas de teintes très flashy ; pas plein de couleurs différentes partout — palette restreinte, style pro.

## Designs universels

### Bouton Envoyer

https://uiverse.io/marcelodolza/fat-zebra-11

### Bouton Détails

https://uiverse.io/cssbuttons-io/massive-mayfly-74

### Bouton Copier

`bouton-copier.html` — bouton Copier (thème logo), feedback « Copié dans le presse-papier ».

### Bouton Exporter

`bouton-exporter.html` — bouton scindé Exporter (action principale + menu : PDF, Markdown, HTML) avec dropdown.

---

## Progression

### Imprimante (animation)

https://uiverse.io/Nawsome/kind-mole-87

### Barre de progression

Source : maquette Stitch Progression 2026-10-29.

HTML :

```html
<div class="w-full max-w-xl my-6 px-4 flex flex-col items-center">
  <div class="loader-track w-full !max-w-xl !h-3.5 bg-slate-200/80 rounded-full shadow-inner">
    <div class="loader-bar !h-full rounded-full" id="progress-bar-fill" style="width: 96%;"></div>
  </div>
</div>
```

CSS :

```css
.typewriter-loader {
    --bg-color: #f8fafc;
    --text-color: #0f172a;
    --brand-color: #2563eb;
    --brand-dark: #1d4ed8;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .loader-track {
    position: relative;
    width: 100%;
    max-width: 26rem;
    height: 8px;
    background: #e2e8f0;
    border-radius: 9999px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
  }
  .loader-bar {
    height: 100%;
    width: 90%;
    border-radius: 9999px;
    background: linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #1d4ed8 100%);
    position: relative;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .loader-bar::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%);
    animation: flow-shimmer 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes flow-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .loader-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 9999px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
```

---

## Accueil

---

## Méthode

---

## Sites suivis

---

## Rapport (hub)

---

## Rapport (page domaine)

---

## Connexion / Inscription

`interface-auth.html` — authentification unifiée (onglets Se connecter / S’inscrire) : e-mail + mot de passe, Google ou GitHub, CGU à l’inscription, thème clair palette logo.

---
## Vérifier propriété

---

## Soft-gate / Verrouillé

---

## Documentation

---

## Légales / Confidentialité

---

## Mon compte

---
