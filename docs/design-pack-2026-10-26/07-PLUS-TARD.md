# Audigy — Plus tard (hors pack design immédiat)

## 1. Compte multi-sites + Google Search Console

- UI « Sites suivis » existe en maquette shell — **données / OAuth GSC / multi-propriétés = hors scope** actuel.
- Ne pas implémenter la liaison GSC « en passant » pendant le lot chrome/dark/logo.

## 2. Bugs & axes ~novembre 2026

Source complète : `refs/bugs-a-reprendre-2026-11.md`  
Pause owner ~1 mois ; reprise autour du **25 nov. 2026**.

Rappel P0 bugs owner :

1. Design cases à cocher (brief)
2. Pastille Rien/Vérif/Fix mal alignée
3. Compteur sélection incorrect
4. Prompt agent trop incomplet (+ injecter stack détectée)
5. Rapport infos trop entassées
6. Flash / layout incorrect 1er affichage (FOUC — lié toggle thème)
7. Constats vie privée manquants

Axes : relancer audit clairement, ETA pendant analyse, liens sources, i18n max 3 langues, empty states, etc.

## 3. Go-live

- OVH + Netlify encore à faire **avec OK owner**.
- Recette : `docs/RECETTE.md` (NVDA/VoiceOver, Firefox, zoom 200 %, contraste, security.txt, auto-audit prod) — hors ce pack.
- Agent cloud annulé sans PR (note bugs) : ne pas relancer sans OK.

## 4. Stitch

- **Gelé.** Toute nouvelle maquette = décision owner explicite.
- PNG rapport mobile 28 o : re-export seulement si owner rouvre Stitch (sinon HTML suffit).
