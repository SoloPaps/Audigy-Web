# Audigy — DESIGN.md
Règles de design pour l'agent de code. Public : des particuliers non techniciens. But : une app calme, fiable et lisible, qui ne ressemble pas à une app générée par IA.

## 1. Principes
1. **Le rapport passe en premier.** L'écran principal, c'est le résultat de l'audit : un score, ce qu'il signifie, puis quoi faire. Pas de vitrine marketing.
2. **Calme > spectaculaire.** Modèles : Plausible/Fathom (une page, peu de chiffres), Stripe/Linear (hiérarchie typographique nette, couleur rare), Mozilla Observatory (note + liste de tests réussis ou échoués, avec explications).
3. **La couleur a un sens.** Couleur vive = un statut. Tout le reste est en encre et papier.
4. **Chaque chiffre s'explique.** Tout score est accompagné d'une phrase en français simple et d'une action.
5. **Assumer l'asymétrie.** Colonne de lecture à gauche, contexte à droite. Hiérarchie claire : on sait toujours quoi lire en premier.
6. **Vérifiable.** Date, URL auditée, version de la méthode et lien du rapport sont toujours visibles.

## 2. Motifs interdits (signes d'« AI slop »)
- Dégradés violet/indigo→bleu/rose, texte en dégradé, blobs flous, halos et box-shadows colorées.
- Violet/indigo Tailwind comme couleur principale (#6366F1, #8B5CF6, #A855F7).
- Glassmorphism (`backdrop-blur` + `bg-white/10`), effet shimmer argenté.
- Emojis utilisés comme icônes ou puces (✨🚀⚡🎯). Icône Lucide dans un carré arrondi en dégradé.
- Inter, Geist, Space Grotesk, Instrument Serif, Poppins ; italique serif sur un seul mot du titre.
- Hero centré type « badge pilule + H1 72px + 2 CTA » ; « Boostez / Propulsez / Sublimez votre site », « en toute simplicité », « nouvelle génération ».
- Grille de 3 cartes identiques icône + titre + 3 lignes ; bento sombre ; bandeau de stats inventées.
- Faux témoignages, avatars générés, logos « Ils nous font confiance » sans relation réelle.
- Liseré coloré à gauche ou en haut des cartes. `rounded-2xl` partout. La même ombre sur toutes les cartes.
- Mode sombre permanent `#0a0a0a` + un seul accent néon ; texte gris peu contrasté.
- Fade-up au scroll sur chaque élément ; animations inline ; non-respect de `prefers-reduced-motion`.
- Thème shadcn/Tailwind par défaut non modifié (le problème vient des tokens par défaut, pas de la librairie).
- Titres et labels en MAJUSCULES ; lorem ipsum ou texte de remplissage ; « 1, 2, 3 étapes » décoratifs.
- **Ne pas utiliser le DSFR ni la police Marianne** : c'est interdit pour un acteur privé (risque de confusion avec un service public). S'inspirer seulement de sa rigueur et de son accessibilité.

## 3. Typographie
- **Texte et interface : Atkinson Hyperlegible Next** (SIL OFL, Braille Institute, pensée pour la lisibilité ; sans-serif en dernier recours).
- **Titres : Source Serif 4** (OFL, Adobe), graisse 600. Donne une voix « rapport / document », à utiliser seulement pour H1–H3.
- **Chiffres et code : JetBrains Mono** (OFL) pour les URL, les en-têtes HTTP et les valeurs techniques. Les scores utilisent la police de texte avec `font-variant-numeric: tabular-nums`.
- Auto-hébergées (woff2, `font-display: swap`), sous-ensemble latin. Aucun appel à Google Fonts (vie privée et écologie).
- Échelle en rem (base 16px, ratio ~1,25) : 12 · 14 · **16 (corps)** · 20 · 25 · 31 · 39 (score). Interligne 1,5 pour le corps, 1,2 pour les titres. Longueur de ligne ≤ 70ch.
- Casse de phrase partout. Graisses autorisées : 400 / 600 / 700 uniquement.

## 4. Couleurs (tokens CSS)
Clair (papier chaud, encre bleu-noir) :
| Token | Hex | Usage |
|---|---|---|
| `--paper` | #FAF8F4 | fond |
| `--surface` | #FFFFFF | panneaux |
| `--ink` | #1B1F24 | texte (16:1) |
| `--ink-2` | #4A5260 | texte secondaire (≥ 7:1) |
| `--line` | #E3DED5 | bordures 1px |
| `--accent` | #0F5C5A | liens, bouton principal (pétrole, ≈ 7:1) |
| `--focus` | #C2410C | anneau de focus 2px |

Couleurs de score (palette bleu/orange, lisible par les daltoniens, **jamais rouge/vert seuls**) :
| Niveau | Plage | Texte/trait | Fond doux | Forme + libellé |
|---|---|---|---|---|
| Bon | 80–100 | #1F5FAD | #E6EEF8 | ● cercle plein, « Bon » |
| À améliorer | 50–79 | #9A5800 | #FBF0DE | ▲ triangle, « À améliorer » |
| Problème | 0–49 | #B3261E | #FBE7E5 | ■ carré, « Problème » |
| Non testé | — | #5F6672 | #F1F1EF | ○ cercle vide, « Non testé » |
Toutes les couleurs de texte font ≥ 4,5:1 sur leur fond. Le statut est **toujours** porté par la forme et le libellé en plus de la couleur.

Sombre (pas de noir pur) : `--paper` #15181C, `--surface` #1D2126, `--ink` #ECE9E3, `--ink-2` #A9B0BA, `--line` #2E343B, `--accent` #5FC1BC ; scores #7FB0EE / #E8A64A / #F08A80. Le thème suit `prefers-color-scheme` et peut être changé à la main (mémorisé en localStorage).

## 5. Espacement, grille, formes
- Échelle de 4px : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Rien en dehors de cette échelle.
- Contenu max 1120px ; grille de 12 colonnes desktop (rapport 8 / contexte 4), une seule colonne sous 768px.
- Rayons hiérarchisés : 4px (champs, badges), 8px (boutons), 12px (panneaux). Pas de pilules sauf pour les filtres.
- La profondeur vient des bordures de 1px, pas des ombres. Une seule ombre est autorisée, pour les menus/modales : `0 4px 16px rgb(0 0 0 / .08)`.
- Icônes : Phosphor ou Tabler en trait 1,5px, 16/20px, couleur du texte, sans fond.

## 6. Composants
**Jauge de score**
- Arc de 270° (pas un donut fermé), trait 8px, piste `--line`, remplissage à la couleur du niveau.
- Le chiffre est au centre (39px, tabular), suivi de « /100 » plus petit, puis du libellé texte en dessous (« À améliorer »).
- `role="img"` + `aria-label="Performance : 72 sur 100, à améliorer"`. Animation de 0 au score en ≤ 400 ms, supprimée si reduced-motion.
- Vue globale : une jauge principale, puis les catégories en **liste** (nom, barre horizontale, score, forme du statut), pas en grille de cartes.

**Liste des problèmes (style Observatory)**
- Tri par sévérité puis par impact. Chaque ligne : forme du statut + libellé, titre en langage courant, une phrase « Pourquoi c'est important », temps estimé, bouton « Voir comment corriger ».
- La correction se déplie (`<details>`/disclosure accessible) : étapes numérotées, un bloc de code copiable si besoin, et un lien vers une source officielle (CNIL, MDN, ANSSI, RGAA).
- Filtres : Tous / Problèmes / À améliorer / Réussis (compteur dans chaque filtre). Les tests réussis restent visibles, repliés.

**Graphiques d'historique**
- Courbes simples : une catégorie sélectionnée à la fois, ou au maximum 3 avec des styles de trait différents (plein, tirets, pointillés).
- Axe Y de 0 à 100 (jamais tronqué), bandes de fond très légères pour les seuils 50/80, points cliquables vers chaque rapport.
- Pas de dégradé sous la courbe, pas de 3D, pas de camembert. Chaque graphique a un **tableau de données équivalent** (bouton « Voir en tableau ») et un résumé texte (« +12 points depuis le 3 mars »).
- Librairie conseillée : Observable Plot ou uPlot (légères), stylées avec les tokens.

**Rapport vérifiable**
- Pied de rapport en mono : URL, date et heure (fuseau Europe/Paris), version de la méthode, identifiant ou empreinte, bouton « Vérifier ce rapport ».

**Boutons** : un seul bouton principal par écran (fond `--accent`), les autres en secondaire bordé ou en lien. Hauteur 40px, cible ≥ 44px sur mobile.

## 7. Ton du texte (particuliers)
- Vouvoiement, phrases courtes (≤ 20 mots), voix active. Le mot technique vient après l'explication : « Votre site met 6 s à s'afficher (LCP) ».
- Dire le constat, la conséquence, puis l'action. Jamais de jargon seul, jamais d'alarmisme (« CRITIQUE !!! »), jamais de culpabilisation.
- Honnêteté : écrire « Nous n'avons pas pu tester… » plutôt que de cacher la limite. Pas de superlatifs ni de mots marketing (« boostez », « révolutionnaire », « en un clic magique »).
- Titre de l'accueil, factuel : « Vérifiez la santé de votre site, gratuitement. » + un champ URL + « Lancer l'audit ».
- Pas d'emoji dans l'interface. Nombres au format français (« 1 234 », « 3,5 s »), dates « 23 oct. 2026 ».

## 8. Accessibilité (RGAA 4.1 / WCAG 2.2 AA minimum)
- Contraste du texte ≥ 4,5:1 (≥ 3:1 pour les gros textes et les éléments graphiques), vérifié dans les deux thèmes.
- Navigation complète au clavier, focus visible (2px `--focus` + offset 2px), lien d'évitement « Aller au contenu ».
- HTML sémantique d'abord (`<main>`, `<nav>`, titres hiérarchiques, `<table>` pour les données). ARIA seulement en complément.
- Formulaires : `<label>` visible, erreurs en texte reliées par `aria-describedby`, pas de placeholder utilisé comme label.
- Résultat d'audit annoncé via `aria-live="polite"`. Zoom à 200 % et reflow à 320px sans scroll horizontal.
- `prefers-reduced-motion` respecté partout. `lang="fr"`. Page de déclaration d'accessibilité.
- Cohérence : Audigy note l'écologie et la vie privée, donc pas de tracker tiers, pas de police distante, page d'accueil < 500 Ko.

## 9. Checklist avant de merger une UI
- [ ] Aucun motif de la section 2 (dégradé, glass, emoji, violet, 3 cartes identiques, hero centré générique).
- [ ] Uniquement des tokens : couleurs, espacements et rayons hors tokens = refus.
- [ ] Chaque statut a une forme + un libellé en plus de la couleur ; test en niveaux de gris et avec un simulateur de daltonisme.
- [ ] Contrastes AA vérifiés en clair et en sombre (axe DevTools / Lighthouse a11y = 100).
- [ ] Parcours complet au clavier, focus visible, lecteur d'écran testé (NVDA ou VoiceOver) sur la jauge et la liste.
- [ ] Texte relu : français simple, sans jargon non expliqué, sans lorem, sans superlatifs.
- [ ] Graphiques : axe 0–100, alternative en tableau, résumé texte.
- [ ] Rendu vérifié à 320px, 768px, 1280px et zoom à 200 %.
- [ ] reduced-motion testé ; aucune animation sans fonction.
- [ ] Poids de la page et requêtes tierces vérifiés (0 tiers).
