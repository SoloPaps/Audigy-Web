# Étapes Audixio — lire en premier

Fusion de `RECAP-ETAPES-PROJET-AUDIXIO.md` (récap owner) et `etapes-refonte/00-LISEZ-MOI.md` (ordre des étapes). Originaux : `archive/fusionnes-2026-10-29/`.

> **Mise à jour du 29/10/2026** — ces décisions priment (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.
> - Vérification de propriété = **5 méthodes** : Google Search Console (recommandée, OAuth lecture seule « siteOwner »), DNS TXT, balise meta, fichier HTML à la racine, fichier `.well-known`. Remplace les « vagues » de preuves du 28/10 et « GSC ≠ vérification » du 27/10.
> - Stripe / Pro **gelés** : liste d'attente seulement. Popup Pro uniquement quand la limite est atteinte (gratuit : 2 sites, 1 lien actif).
> - Thème **clair par défaut**, suit `prefers-color-scheme`, le choix manuel gagne. Thème sombre complet = **plus tard**.
> - Notes **A à F** (E et F ajoutées). Pas de /100.

## Partie 1 — Récap des étapes (très simple, 28/10 soir)

**Pour :** Jojo (owner Papi_Dratix)  
**Date :** 28 octobre 2026 soir (Europe/Paris)  
**Marque :** Audixio  
**Où :** projet local `C:\Projets\Audigy-Web` (OrdiBibi) — **pas de commit GitHub** pour cette session.

---

### 1. Où on en est

On a un produit d'audit de site web déjà bien avancé en local (moteur, interface, compte, design).  
Ce soir on a **figé les règles** (qui voit quoi, vie privée, preuves, prix Pro, qui décide la bêta).  
La priorité maintenant : **finir le cœur** en local (droits serveur, hub, soft-gate, preuves simples), tester chez toi, puis **toi seul** décides quand ouvrir une bêta publique.

---

### 2. Ce qui est décidé (liste simple)

- **Marque** = Audixio.
- **Sans preuve de propriété** : on montre en détail Perf, SEO, Éco, Qualité + Accessibilité (lettre A–F avec mention « mesure automatique / partielle »).  
  **Verrouillés** (domaines entiers) : Sécurité, Vie privée, DNS/mail.
- **Comment réparer** : conseils **généraux** tout de suite sur les domaines ouverts ; conseils **pour ton site précis** seulement après preuve.
- **Vie privée (bêta / local)** : on montre **tout** ce qu'on peut **sans** liste DuckDuckGo Tracker Radar et **sans** navigateur d'audit = tests partiels (cookies Set-Cookie, scripts visibles, bandeaux OneTrust/Cookiebot/Didomi, liens politique cookies), toujours écrits « partiel / automatique ».
- **Plus tard** : si ça marche, **toi** loues un petit serveur navigateur (~5–12 €/mois), pas un achat one-shot.
- **Preuves** tout de suite : fichier + balise meta + lien HTML. DNS = vague d'après. Connexion hébergeur / Search Console = encore plus tard.
- **Pro** : cible environ **9 €/mois** — **après** le cœur, pas urgent.
- **Toi** : juriste, testeurs, et **go bêta publique**. Jojo/Cursor ne décident pas le lancement.
- **Maximum en local** jusqu'à ton feu vert.

---

### 3. Ce que Jojo / Cursor font vs ce que toi seul fais

| Jojo / Cursor (OK) | Toi seul (owner) |
|--------------------|------------------|
| Coder le cœur : droits serveur, hub, Verrouillé, connexion e-mail + mot de passe / Google / GitHub | Juriste (CGU, mentions, licences) |
| Preuves fichier + meta + lien HTML | Recruter / contacter les testeurs |
| Brief + export MD de base | **Décider** la bêta publique |
| Anti-abus basique | Licence / alternative Tracker Radar (si un jour) |
| Tests vie privée partiels HTTP/HTML | Louer le VPS navigateur (~5–12 €/mois) quand tu veux |
| Docs alignées, recettes locales | Marque / INPI si besoin ; Netlify Personal + Supabase Pro au lancement |
| | Prix final Pro / paiement |

---

### 4. Étapes dans l'ordre

1. **Aligner les docs** avec ces décisions — **fait** (28 oct soir).
2. **Cœur technique** : capabilities serveur + filtrage → soft-gate Verrouillé → hub rapport (note + TOP 10 + 8 cartes) → connexion e-mail + mot de passe / Google / GitHub.
3. **Preuves immédiates** : fichier + balise meta + lien HTML (page Vérifier).
4. **Brief + export MD** de base ; sélection Rien / Vérif / Fix synchronisée.
5. **Vie privée partiel** HTTP/HTML (libellés honnêtes) — sans DDG, sans navigateur d'audit.
6. **Anti-abus basique** (limites audits / liens).
7. **Tests locaux** par toi (recette sur ta machine).
8. **[Owner]** Juriste — quand tu estimes le produit assez stable.
9. **[Owner]** Go **bêta publique** — seulement quand **tu** dis que c'est bon.
10. Hébergement payant au lancement public (Netlify Personal + Supabase Pro) — pas forcément maintenant.
11. **Plus tard** : Pro ~9 €/mois · DNS verify · VPS navigateur location mensuelle · Option polish / EN · OAuth hébergeur si utile.

---

### 5. Ce qu'on ne fait PAS tout de suite

- Pas de Tracker Radar DuckDuckGo.
- Pas de serveur navigateur d'audit (VPS) avant ton OK.
- Pas de Pro / paiement maintenant.
- Pas de DNS comme preuve obligatoire au MVP (c'est la vague d'après).
- Pas d'OAuth hébergeur / Search Console tout de suite.
- Pas de redesign « hub PARTIEL » séparé (un hub COMPLET + cadenas suffit).
- Pas d'anglais complet ni chrome ultra-fancy avant le cœur.
- Pas de commit / push GitHub sauf si tu le demandes explicitement.
- Pas de go bêta décidé par Jojo.

---

### 6. Prochaines actions concrètes cette semaine

1. Cursor continue le **cœur** : matrice droits côté serveur + UI Verrouillé + hub.
2. Brancher les preuves **fichier + meta + lien HTML**.
3. Afficher la vie privée **partielle** (HTTP/HTML) avec libellés clairs.
4. Toi : rejouer la **recette locale** sur 1–2 de tes sites.
5. Toi : noter ce qui bloque pour une éventuelle bêta (bugs, textes, juriste).
6. **Ne pas** déployer en public tant que tu n'as pas dit « go ».

---

### Fichiers utiles

- Décisions figées : `docs/00-DECISIONS.md`
- Produit : `docs/produit/FONCTIONNEMENT.md`
- Droits : `docs/produit/MATRICE-STATUT-DROITS-CANON.md`
- Soft-gate : `docs/produit/SOFT-GATE-PARTIEL-CANON.md`
- Étapes refonte : `docs/etapes/`


---

﻿## Partie 2 — Étapes de refonte (fichiers 02 à 11)

Ordre global pour modifier le site **comme décidé** le 26 octobre 2026. Une étape à la fois. Pas de déploiement.

### Prérequis

- Repo local : `SoloPaps/Audigy-Web` déjà cloné chez l’owner (ce pack ne clone pas).
- Pack design sur `main` : `docs/design/`.
- Quota Cursor faible (~1 % au 26 oct. ; renouvellement ~**20 novembre 2026**) → privilégier Gemini / Gemini AI Studio pour la rédaction longue si besoin ; Cursor pour le code ciblé quand le quota revient.
- Lire `docs/produit/FONCTIONNEMENT.md` + `docs/produit/SOFT-GATE-PARTIEL-CANON.md` + `docs/produit/MATRICE-STATUT-DROITS-CANON.md` (après étape 01) avant toute feature produit. Soft-gate = **PARTIEL** + **lock-components** + matrice droits (28 oct 2026 soir), plus soft-gate total.

### Ordre

| # | Fichier | Sujet |
|---|---|---|
| 01 | [`01-fondations-docs.md`](../archive/etapes-refonte/01-fondations-docs.md) | Merger ce pack docs (**fait**, archivé) |
| 02 | `02-chrome-ui.md` | AppHeader, logo, i18n, drawer |
| 03 | `03-theme-dark.md` | Tokens dark gelés |
| 04 | `04-promesse-et-copie.md` | 5 corrections + 8 domaines |
| 05 | `05-rapport-deux-couches.md` | Verdict / technique ; bugs |
| 06 | `06-compte-et-plafonds.md` | Connexion e-mail + mot de passe / Google / GitHub, 2 sites, 1 lien |
| 07 | `07-partage-soft-gate.md` | Liens, soft-gate **PARTIEL**, table / filtre serveur |
| 08 | `08-export.md` | Export gratuit basique |
| 09 | `09-pro-plus-tard.md` | Pro après go-live seulement |
| 10 | `10-recette-et-lancement.md` | VP partielle HTTP/HTML (bêta), LICENSE, PART-27 |
| 11 | `11-i18n-langues.md` | Langues FR/EN (Cursor) : routage `/en/`, JSON, bouton EN, hreflang, sitemap |

### Interdits communs à toutes les étapes

- `netlify deploy`, liaison Git Netlify, deploy previews
- Relancer Stitch
- Inventer des features hors `FONCTIONNEMENT.md`
- GitHub Actions comme navigateur de service public
- Tests actifs sur site non vérifié
- `git push` sans demande explicite owner

### Critère global de done (refonte)

Chaque étape a ses critères. La refonte « gratuite go-live ready » = étapes **01→08** + **10** (hors Pro). L’étape **09** reste documentée, pas codée avant go-live.

