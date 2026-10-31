# Audixio — Récap des étapes (très simple)

**Pour :** Jojo (owner Papi_Dratix)  
**Date :** 28 octobre 2026 soir (Europe/Paris)  
**Marque :** Audixio (ex-Audigy)  
**Où :** projet local `C:\Projets\Audigy-Web` (OrdiBibi) — **pas de commit GitHub** pour cette session.

---

## 1. Où on en est

On a un produit d'audit de site web déjà bien avancé en local (moteur, interface, compte magic link, design).  
Ce soir on a **figé les règles** (qui voit quoi, vie privée, preuves, prix Pro, qui décide la bêta).  
La priorité maintenant : **finir le cœur** en local (droits serveur, hub, soft-gate, preuves simples), tester chez toi, puis **toi seul** décides quand ouvrir une bêta publique.

---

## 2. Ce qui est décidé (liste simple)

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

## 3. Ce que Jojo / Cursor font vs ce que toi seul fais

| Jojo / Cursor (OK) | Toi seul (owner) |
|--------------------|------------------|
| Coder le cœur : droits serveur, hub, Verrouillé, magic link | Juriste (CGU, mentions, licences) |
| Preuves fichier + meta + lien HTML | Recruter / contacter les testeurs |
| Brief + export MD de base | **Décider** la bêta publique |
| Anti-abus basique | Licence / alternative Tracker Radar (si un jour) |
| Tests vie privée partiels HTTP/HTML | Louer le VPS navigateur (~5–12 €/mois) quand tu veux |
| Docs alignées, recettes locales | Marque / INPI si besoin ; Netlify Personal + Supabase Pro au lancement |
| | Prix final Pro / paiement |

---

## 4. Étapes dans l'ordre

1. **Aligner les docs** avec ces décisions — **fait** (28 oct soir).
2. **Cœur technique** : capabilities serveur + filtrage → soft-gate Verrouillé → hub rapport (note + TOP 10 + 8 cartes) → magic link.
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

## 5. Ce qu'on ne fait PAS tout de suite

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

## 6. Prochaines actions concrètes cette semaine

1. Cursor continue le **cœur** : matrice droits côté serveur + UI Verrouillé + hub.
2. Brancher les preuves **fichier + meta + lien HTML**.
3. Afficher la vie privée **partielle** (HTTP/HTML) avec libellés clairs.
4. Toi : rejouer la **recette locale** sur 1–2 de tes sites.
5. Toi : noter ce qui bloque pour une éventuelle bêta (bugs, textes, juriste).
6. **Ne pas** déployer en public tant que tu n'as pas dit « go ».

---

## Fichiers utiles

- Décisions figées : `docs/DECISIONS-OWNER-2026-10-28-soir.md`
- Produit : `docs/FONCTIONNEMENT.md`
- Droits : `docs/design-pack-2026-10-26/MATRICE-STATUT-DROITS-CANON.md`
- Soft-gate : `docs/design-pack-2026-10-26/SOFT-GATE-PARTIEL-CANON.md`
- Étapes refonte : `docs/etapes-refonte/`
