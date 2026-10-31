# Étape 05 — Rapport à deux couches

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Guide de correction = section « plan d'action » de la page détail (onglets CMS / code), une fiche par type de constat ; gains affichés seulement s'ils sont sourcés.
> - Notes **A à F** (E et F ajoutées). Pas de /100.

## Objectif

Verdict en haut (note, **TOP 10 titres** sur hub, français simple). Technique sur pages domaine. **Pas** 3 priorités détaillées sur le hub. Brancher droits via matrice + composants Verrouillé.

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §1 et §3
- `docs/design/DESIGN.md` (lecture du rapport)
- `docs/design/02-PAGES.md` (Rapport)
- `docs/archive/audigy-titled-2026-10-28/bugs-a-reprendre-2026-11.md` (items rapport / clarté)
- Composants rapport sous `apps/web/`

## À faire

1. Couche 1 toujours visible en premier.
2. Détail domaines / Comment corriger / brief : selon **soft-gate PARTIEL** + matrice brief (voir étapes 06–07 + `SOFT-GATE-PARTIEL-CANON.md` / `MATRICE-STATUT-DROITS-CANON.md`) ; structure UI prête (double note, badges Verrouillé, priorités mixtes).
3. Traiter les bugs rapport listés comme bloquants pour la clarté (ceux cochables maintenant ; le reste reste dans bugs-a-reprendre).
4. Liens `/methode` depuis constats catalogués conservés.

## Critères de done

- [ ] Particulier comprend la note + TOP 10 titres (hub) sans noyer le détail
- [ ] Technique accessible mais repliée par défaut
- [ ] Pas de barre de brief collée qui cache les constats
- [ ] Bugs P0 rapport traités ou explicitement reportés avec raison

## Interdits

- Exposer domaines sensibles (Sécurité/Vie privée/DNS) ou lettre A–F de ces domaines en soft-gate / sans vérif ; blur CSS sur donnée existante
- Refaire tout le moteur « pour le plaisir »


## Maquettes rapport (28 oct)

- `page_rapport_hub`, `page_domaine_ouvert`, `page_domaine_verrouille`, `page_brief_ia`, `page_detail_constat`
- Design COMPLET + UI Verrouillé ; sélection sync domaine↔brief ; lettres A–F
- SSOT : `MATRICE-STATUT-DROITS-CANON.md`
