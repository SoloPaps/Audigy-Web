# Étape 07 — Partage et soft-gate PARTIEL

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Révocation des accès : section « Accès partagés » du Compte + raccourci dans Sites.

## Objectif

Liens public (30 j, soft-gate **partiel**, bandeau, noindex, retrait 1 clic) et liens équipe (lecture seule + brief, révocable). **Capabilities serveur** + RLS + composants Verrouillé (matrice). Filtre **serveur** + RLS (plus soft-gate total).

Canon : `docs/produit/SOFT-GATE-PARTIEL-CANON.md` + `docs/produit/MATRICE-STATUT-DROITS-CANON.md`  
Spec (historique) : `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/` — **canon** = SOFT-GATE + MATRICE ci-dessus.

## Fichiers à lire

- `docs/produit/FONCTIONNEMENT.md` §4, §5, §7
- `SOFT-GATE-PARTIEL-CANON.md` / `MATRICE-STATUT-DROITS-CANON.md`
- Pages Soft-gate / Partage (design pack `02-PAGES.md`)
- Code partage / tokens de lien existants

## À faire

1. Création de lien = **compte obligatoire**.
2. Lien public : 30 jours ; soft-gate **partiel** (ouverts détaillés ; Sécurité/Vie privée/DNS = Verrouillé, données absentes) ; **bandeau permanent** ; `noindex, nofollow` ; date audit visible ; retrait 1 clic ; **aucun brief**.
3. Lien équipe : lecture seule selon vérif proprio ; brief lecture seule même sans compte destinataire ; révocable.
4. Sans compte après audit : **même vue** soft-gate partiel ; brief = aucun (CTA compte).
5. **Compte sans site vérifié** : soft-gate partiel + **brief PARTIEL** — renvoi `FONCTIONNEMENT.md` §5 / §7.
6. Domaines sensibles : badge Verrouillé, **pas** de lettre A–F, pas de finding dans le payload.
7. Filtre serveur + RLS documentés et appliqués (pas de blur CSS sur donnée existante).
8. Priorités mixtes + double note (partielle visible ; globale non envoyée).

## Critères de done

- [ ] Soft-gate PARTIEL identique (aperçu sans compte ≈ lien public ≈ compte sans site vérifié pour la **vue** ; brief diffère : aucun vs PARTIEL)
- [ ] Aucune donnée Sécurité/Vie privée/DNS dans HTML/JS/API non vérifié
- [ ] Bandeau + noindex sur lien public
- [ ] Retrait / révocation fonctionnels
- [ ] Plafond 1 lien actif respecté (étape 06)

## Interdits

- Indexer les liens publics (SEO)
- Afficher versions / IP / chemins / lettres A–F sensibles en public
- Servir un brief aux anonymes ou sur lien public
- Soft-gate « total » (cacher aussi Perf/SEO/Éco/Qualité)
