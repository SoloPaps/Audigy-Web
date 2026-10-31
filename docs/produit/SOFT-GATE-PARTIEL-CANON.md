# Soft-gate PARTIEL — Canon Cursor (28 octobre 2026, soir)

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Un seul jeu de rapport **adaptatif** (hub, domaine, détail) avec **un** bandeau de statut discret ; verrous côté serveur. Les pages de domaine restreint **gardent** les pastilles HTTPS / HSTS / X-Frame.
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.

**Statut :** figé owner.  
**SSOT droits :** [`MATRICE-STATUT-DROITS-CANON.md`](MATRICE-STATUT-DROITS-CANON.md) — **toute** question « qui voit quoi » → matrice.  
Ce fichier = règles soft-gate + **stratégie lock-components** + anti-fuite.

## Sources

0. `docs/00-DECISIONS.md` + `docs/etapes/00-LISEZ-MOI.md` (SSOT décisions soir)

1. `MATRICE-STATUT-DROITS-CANON.md` — **matrice statut → droits** (SSOT)
2. `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/Audixio-spec-officielle-soft-gate.md`
3. `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/Audixio-rapport-soft-gate-partiel-COMPLET-2026-10-28.md`
4. `docs/produit/FONCTIONNEMENT.md`, `AGENTS.md`, `.cursor/rules/00-core.mdc`

---

## Interdit (ne plus écrire ni coder)

- « Soft-gate total » / « presque tout derrière compte + vérif »
- « Pas de détail exploitable avant vérif »
- « Soft-gate = note + scores + priorités de configuration seulement »
- « Sans compte / non vérifié = pas de brief » → remplacé par la **matrice** (anonyme = aucun ; compte non vérif = PARTIEL)
- « Il faut une maquette Stitch hub PARTIEL séparée » → **FAUX** (soir 28 oct)
- Blur CSS / `display:none` sur une **vraie** lettre ou finding déjà dans le DOM/JSON
- Lettre A–F visible (ou envoyée) pour Sécurité / Vie privée / DNS tant que non autorisé
- Claim RGAA / EAA / « conforme » sur Accessibilité sans vérif (Option B1)
- Nommer HSTS / X-Frame / CSP dans un **aperçu Verrouillé**
- Brief réservé Pro ; 3 priorités **détaillées** sur le hub ; score UI **/100** comme système principal (lettres A–F)

---

## Stratégie UX lock (CRITIQUE — 28 oct soir)

1. **UN design** = hub / domaine / brief en mode **COMPLET** (vérifié).  
2. Si le statut n’a pas les droits → **composants UI Verrouillé** (badge, teaser adouci, CTA), **pas** un autre layout Stitch.  
3. **Pas** d’exigence de hub Stitch PARTIEL séparé.  
4. Cursor implémente des **états locked réutilisables** pour chaque capacité gated (matrice).  
5. Mock Stitch = démo (souvent mélange vérifié/non) ; produit = capabilities serveur. Corriger les endroits où Stitch a montré ouvert à tort.

---

## Soft-gate PARTIEL (règle domaines)

| Domaine | Statut | Sans droit (anon / compte non vérif / lien public) | Avec droit (vérifié / Pro / équipe si proprio OK) |
|---|---|---|---|
| Performance | Ouvert | Lettre A–F, détail, priorités, guides **génériques** | + Comment corriger **branché site** |
| SEO | Ouvert | Idem | Idem |
| Écologie | Ouvert | Idem | Idem |
| Qualité technique | Ouvert | Idem | Idem |
| Accessibilité (A11y) | **Option B1** | Lettre A–F **gardée** + indicateurs ; mention **« mesure automatique / partielle »** ; **zéro** claim RGAA/EAA | + analyse conformité |
| Sécurité | **Verrouillé** | Badge **Verrouillé**, **pas** de lettre ; teaser **général** (pas HSTS/X-Frame) | Vue complète |
| Vie privée | **Verrouillé** | Idem (domaine entier verrouillé si non éligible). Moteur bêta/local = tests **partiels** HTTP/HTML hors soft-gate payload | Vue complète |
| DNS / e-mail | **Verrouillé** | Idem | Vue complète |

Données sensibles : **ABSENTES** payload / HTML / JS / API (filtre serveur + RLS).

---

## Deux notes

1. **Note partielle** (sans vérif) : domaines ouverts (+ A11y si comptée). Libellé UI exact :  
   `partielle · N domaines · site non vérifié`  
   (N = nombre **réel**). Sensibles **exclus** du calcul.
2. **Note globale** : **non calculée / non envoyée** tant que non vérifié. UI = cadenas neutre (pas couleur A–F, pas ombre de chiffre).

---

## Hub & priorités

- Hub = note + **TOP 10** priorités (**titre seul**, clic → domaine `#ancre`) + **8 cartes** domaines + CTA Brief **hors page**.  
- **Pas** 3 priorités détaillées sur le hub.  
- Non vérifié : 1–2 priorités **ouvertes** + teaser sensible flou + CTA Vérifier (pas le titre exact s’il révèle le trou).

---

## Brief IA

Voir matrice. Résumé :

| Contexte | Brief |
|---|---|
| Anonyme | **Aucun** — CTA compte |
| Compte + non vérifié | **PARTIEL** — préfixe `Audixio Brief — PARTIEL (Site non vérifié)` |
| Compte + vérifié / Pro | **COMPLET** — préfixe `Audixio Brief — COMPLET (Site vérifié)` |
| Lien public 30 j | **Aucun** + bandeau |
| Lien équipe | **Lecture seule** (même sans compte destinataire), selon vérif proprio |

Brief **pas** Pro-only. Page brief = sélection sync + réglages prompt + aperçu / générer / copier.

---

## Sélection Rien / Vérif / Fix

Éditable sur **pages domaine** et **page Brief** ; **une source sync**. Domaine peut garder « Copier le prompt » unitaire.

---

## Comment corriger

| | Sans vérif | Après vérif |
|---|---|---|
| Guides **génériques** | OK | OK |
| Comment corriger **branché** site (personnalisé au site) | **Non** | Oui |

Conseils **génériques** ouverts sur constats domaines non sensibles ; conseils **personnalisés au site** seulement après preuve de propriété.

---

## Lien public 30 j

- Miroir soft-gate partiel + **bandeau permanent** vue limitée.  
- `noindex, nofollow`.  
- Pas de brief. Masquer Exporter / Partager / Relancer côté lecteur.

---

## Anti-fuite + serveur

- Filtre source (Netlify Functions / API Astro / Edge) + RLS.  
- Capabilities API = vérité ; front = rendu ouvert vs Verrouillé.  
- Revérif propriété avant endpoint sensible / regen brief ; preuve expirée → `unverified` + purge cache.  
- Contrat : voir spec officielle §6 + matrice.

---

## Plafonds

- Gratuit : **2 sites** + **1 lien** ; export base OK **compte** même non vérifié.  
- Pro (après go-live) : **10 sites** ; extras histo / alertes / exports soignés.  
- Vie privée bêta/local : tests **partiels** HTTP/HTML (pas DDG, pas navigateur d'audit requis) ; VPS navigateur = plus tard (location mensuelle owner). Soft-gate domaine Vie privée = Verrouillé si non éligible.

---

## Pages UI

Maquettes rapport (28 oct) : `page_rapport_hub`, `page_domaine_ouvert`, `page_domaine_verrouille`, `page_brief_ia`, `page_detail_constat` — voir `maquettes/INDEX.md` + `02-PAGES.md`.  
`page_rapport_audit` = **legacy** (secondaire). Design = COMPLET + lock components — **pas** redesign Stitch PARTIEL séparé.
