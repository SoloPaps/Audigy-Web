# Décisions owner — 28 octobre 2026 soir (post-Claude)

**Statut :** figé. Source de vérité pour l'alignement docs du soir.  
**Projet :** Audixio (ex-Audigy) — `C:\Projets\Audigy-Web` (OrdiBibi, local).  
**Pas de commit GitHub** pour cette session.

Voir aussi : `docs/RECAP-ETAPES-PROJET-AUDIXIO.md`, `docs/journal/journal-corrections-docs-2026-10-28.md`.

---

## 1. Marque

- **Audixio** (ex-Audigy). Noms techniques historiques (`@audigy/*`, `*.audigy.test`, dossier repo) restent ; UI = Audixio.

## 2. Périmètre Cursor / Jojo (cœur d'abord)

**Oui, maintenant :**
- Capabilities serveur + filtrage avant client (anti-fuite)
- Soft-gate + composants **Verrouillé**
- Hub rapport (note + TOP 10 titres + 8 cartes + Brief hors hub)
- Magic link e-mail
- Sync sélection Rien / Vérif / Fix domaines ↔ Brief
- Preuves propriété **immédiates** (fichier + meta + lien HTML)
- Brief / export MD de base
- Anti-abus basique
- Tests vie privée **partiels** HTTP/HTML

**Après (pas bloquant le cœur) :**
- Pro (~9 €/mois, 10 sites)
- Chrome fancy / polish design avancé
- EN (i18n complet)
- Serveur navigateur d'audit (location VPS mensuelle)
- DNS verify
- OAuth hébergeur / Search Console-like

## 3. Soft-gate PARTIEL (inchangé)

- Anonyme / compte non vérifié / lien public : détail **ouvert** sur Perf, SEO, Éco, Qualité + A11y B1.
- **Domaines entiers Verrouillés** : Sécurité, Vie privée, DNS/mail (pas de lettre A–F, données absentes payload).
- Un design hub **COMPLET** + Verrouillé (pas de hub PARTIEL Stitch séparé).
- Note partielle = ouverts (+ A11y) ; note globale absente serveur si non vérifié.

## 4. « Comment réparer / corriger »

- Conseils **génériques** : ouverts sur constats des domaines non sensibles.
- Conseils **personnalisés au site** (Comment corriger branché) : **seulement** après preuve de propriété.

## 5. Accessibilité (vue publique)

- Lettre **A–F gardée** (owner a écarté « indicateurs sans lettre »).
- Mention obligatoire : **« mesure automatique / partielle »**.
- Zéro claim RGAA / EAA / « conforme ».

## 6. Vie privée (MAJ soir + précision)

**Bêta / local :**
- Afficher **tout** ce qu'on peut trouver **sans** Tracker Radar DuckDuckGo et **sans** navigateur d'audit.
- = tests partiels HTTP/HTML : Set-Cookie 1er chargement, scripts tiers évidents, CMP connus (OneTrust, Cookiebot, Didomi), liens politique cookies / confidentialité.
- Toujours libellés **« partiel / automatique »**.

**Ensuite seulement (owner) :**
- Si ça marche et que le site est peaufiné → mettre en place un **serveur navigateur** d'audit en **location mensuelle** (VPS UE typiquement ~5–12 €/mois).
- **Pas** un achat one-shot de navigateur.

**Interdit au lancement :** DuckDuckGo Tracker Radar tant que licence commerciale / liste alternative OK (owner).

**Soft-gate :** domaine Vie privée entier reste **Verrouillé** pour non-éligibles (inchangé).

## 7. Preuves de propriété

| Vague | Méthodes |
|-------|----------|
| **Immédiat (MVP)** | (1) fichier TXT · (2) balise meta · (4) lien HTML |
| **Vague suivante** | (3) DNS TXT / CNAME |
| **Plus tard** | (6) OAuth hébergeur / Search Console-like si utile |

Trio marché cible = fichier + balise/lien + DNS (DNS **décalé**).

## 8. Pro

- Prix cible **~9 €/mois**.
- 10 sites ; historique, alertes, exports soignés.
- **Après** le cœur — pas bloquant.
- Brief IA **pas** réservé au Pro.

## 9. Ops / lancement

- **Maximum en local.**
- Juriste = **owner**.
- Recrutement testeurs = **owner**.
- **Bêta publique seulement quand owner décide** (pas de go Jojo/Cursor).
- Esprit mini-bêta 5–10 possible, mais le chemin figé = local max → go owner → bêta publique.
- Au lancement public : Netlify Personal + Supabase Pro (pas forcément maintenant).

## 10. Hub UX (déjà figé)

- Note + TOP 10 titres priorités + 8 cartes domaines.
- Brief hors hub.
- Sélection Rien/Vérif/Fix sync domaines + Brief.
- Un design COMPLET + Verrouillé.
