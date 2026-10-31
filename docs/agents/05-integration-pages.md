# Agent 05 — Intégration pages (une page = une conversation)

- **Modèle Cursor** : principal **Grok 4.7** · tests de la page → **DeepSeek V4.1 Flash** · secours **Composer 2.5**.
- **Phase** : 4. Ordre (brief owner) : **accueil → rapport (hub, domaine ouvert, domaine verrouillé, brief, détail constat) → compte → sites suivis** (« dashboard » = **Sites suivis**, `couleurs…` §B.3).

## Docs à lire en premier (pour la page X)
1. `docs/design/maquettes/<dossier>/code.html` **+** `screen.png` (ensemble)
2. `docs/design/01-REGLES-STRICTES.md`
3. `docs/design/02-PAGES.md` — section de la page (checklist)
4. `docs/design/couleurs-palette-et-phrases-Cursor.md`
5. `docs/design/06-BACKLOG.md` (nits de la page)
6. `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (pages rapport / brief / liens)
- Index des dossiers : `maquettes/INDEX.md`. Ignorer `obsoletes/` et les PNG ≤ 100 octets.

## Ce qu'il doit faire
- Body **pixel-perfect** structure Stitch ; remplacer header/footer Stitch par le shell.
- Couleurs remappées en tokens ; copie de la page corrigée (même agent, pas d'agent « textes seuls »).
- Brancher API/moteur et capabilities ; composants **Verrouillé** réutilisables (pas de maquette PARTIEL séparée).
- Page testée en clair et en sombre (`prefers-color-scheme`).
- Page connexion : e-mail + mot de passe + boutons Google / GitHub (remap de la maquette `page_connexion/` ; `page_lien_email_envoye/` devient confirmation d'e-mail).
- Brancher les vrais états (anonyme par défaut, pas de faux avatar / faux Pro).

## Interdits stricts
- Modifier la maquette ou réinventer la mise en page.
- Plusieurs pages dans une conversation ; « agent toutes les pages ».
- Animations lourdes (seulement celles déjà dans le HTML Stitch).
- Hub avec 3 priorités détaillées ; scores /100 ; HSTS/X-Frame dans un aperçu verrouillé.
- Chaînes en dur (toujours `t()`).

## Livrables
- Page Astro + îlots Svelte, clés i18n FR
- Test Playwright + axe de la page

## Checklist de fin
- [ ] Checklist `02-PAGES.md` de la page cochée
- [ ] Comparaison visuelle vs `screen.png`
- [ ] axe 0 violation, contraste AA
- [ ] États anon / non vérifié / vérifié testés si page rapport

## Handoff
→ page suivante (nouvelle conversation) ; après la dernière : **Agent motion** (anims légères ciblées hero/jauge, `workflow…` §6 — réutiliser ce fichier + `01-REGLES-STRICTES.md` §7) puis **Agent 06 Tests & scripts**.
