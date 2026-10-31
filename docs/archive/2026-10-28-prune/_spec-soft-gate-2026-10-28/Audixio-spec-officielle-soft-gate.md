## Addendum 28 oct soir (owner)

- SSOT droits : `docs/design-pack-2026-10-26/MATRICE-STATUT-DROITS-CANON.md`.
- **Un design COMPLET** + composants UI **Verrouillé** ; **pas** de maquette hub PARTIEL séparée.
- Hub = note + TOP 10 titres + 8 cartes + Brief hors page.
- Sélection Rien/Vérif/Fix sync domaine ↔ brief.
- Serveur = capabilities ; findings sensibles absents du client locked.
- Libellé note partielle : `partielle · N domaines · site non vérifié`.
- Soften teasers locked (pas HSTS/X-Frame dans aperçu Verrouillé).

---

# Audixio — Spécifications Produit & Architecture Soft-Gate Partiel (Officiel)

> **MAJ owner 28 oct 2026 soir (post-Claude)** : voir `docs/DECISIONS-OWNER-2026-10-28-soir.md`. Vie privée bêta/local = tests **partiels HTTP/HTML** (pas DDG Tracker Radar, pas navigateur d'audit requis) ; VPS navigateur = location mensuelle plus tard (owner). Pro cible **~9 €/mois**. Preuves immédiat = fichier + meta + lien HTML ; DNS = vague suivante. A11y = lettre A–F gardée + « mesure automatique / partielle ». Bêta publique = go **owner seul**. Soft-gate domaines sensibles inchangé.


**Date :** 28 octobre 2026  
**Projet :** Audixio (ex-Audigy)  
**Périmètre :** Source de vérité produit, UI/UX, API, Supabase RLS, matrice des droits et brief IA.  
**Statut :** Figé & Validé.

---

## 1. Résumé Exécutif & Vision

Audixio (anciennement Audigy) est un outil d'audit web qui analyse un site sur **8 domaines** et restitue les résultats en **français clair**.

- **Double public, même note :**
 - *Particuliers :* Note (lettres A-F), TOP 10 titres sur le hub, explications simples (pas 3 priorites detaillees MonScore sur le hub).
  - *Professionnels (freelances, agences, devs) :* Détail par domaine, parcours « Comment corriger », brief IA structuré (Rien / Vérif / Fix).
- **Principe d'exécution :** Passif par défaut. Les tests actifs exigent la preuve de propriété du site (vérifiée et re-contrôlée dynamiquement).
- **Règle Soft-Gate Partiel :** Remplace le soft-gate total. L'utilisateur anonyme ou non vérifié obtient de la valeur immédiate sur 4 domaines non sensibles. Les domaines critiques restent totalement verrouillés côté serveur.

---

## 2. Cartographie des 8 Domaines & Règle d'Affichage

| Domaine | Statut Soft-Gate | Vue Non Vérifiée (Anonyme / Compte non vérifié) | Vue Vérifiée (Propriétaire / Équipe) |
| :--- | :--- | :--- | :--- |
| **Performance** | 🟢 Ouvert | Score/Lettre A–F, détail, priorités, guides génériques | Vue complète + *Comment corriger* nommé/déterminé |
| **SEO** | 🟢 Ouvert | Score/Lettre A–F, détail, priorités, guides génériques | Vue complète + *Comment corriger* nommé/déterminé |
| **Écologie** | 🟢 Ouvert | Score/Lettre A–F, détail, priorités, guides génériques | Vue complète + *Comment corriger* nommé/déterminé |
| **Qualité technique** | 🟢 Ouvert | Score/Lettre A–F, détail, priorités, guides génériques | Vue complète + *Comment corriger* nommé/déterminé |
| **Accessibilité (A11y)** | 🟡 Zone Grise (Option B1) | Score/Lettre A–F OK + indicateurs bruts (contraste, alt). *Zéro claim RGAA/EAA.* | Vue complète + rapport d'analyse d'impact de conformité |
| **Sécurité** | 🔴 Verrouillé | **Pas de lettre A–F.** Badge `🔒 Verrouillé`, micro-texte général | Vue complète (findings, headers, preuves, fixes) |
| **Vie privée (CNIL)** | 🔴 Verrouillé | **Pas de lettre A–F.** Badge `🔒 Verrouillé` *(bêta: tests partiels HTTP/HTML possibles côté moteur ; payload soft-gate absent si non éligible ; pas DDG ; VPS navigateur location mensuelle plus tard)* | Vue complète |
| **DNS / E-mail** | 🔴 Verrouillé | **Pas de lettre A–F.** Badge `🔒 Verrouillé`, micro-texte général | Vue complète (SPF, DKIM, DMARC, vulnérabilités mail) |

*Note : Disponibilité et Réputation sont traitées hors note principale.*

---

## 3. Système de Notation (Double Note)

Afin d'éviter tout « faux sentiment de sécurité » ou dénigrement injustifié :

1. **Note Partielle (Visible sans vérification) :**
   - Calculée uniquement sur les domaines ouverts : `Performance`, `SEO`, `Écologie`, `Qualité technique` (et `Accessibilité` en B1).
   - Libellé UI obligatoire : `Note partielle (4 domaines · Site non vérifié)`.
2. **Note Globale (Masquée sans vérification) :**
   - Masquée par un état cadenas neutre dans l'UI tant que la propriété n'est pas vérifiée.
   - **Règle Serveur Strict :** La note globale et les lettres A–F des domaines sensibles ne sont **jamais calculées ni envoyées** dans le payload JSON si la session n'est pas vérifiée. Aucun blur CSS sur donnée existante.

---

## 4. Matrice Définitive des Briefs IA & Droits

L'accès au Brief IA est le levier principal de conversion (création de compte) et de protection anti-scraping :

```
                                  ┌────────────────────────┐
                                  │   Tentative d'accès    │
                                  │      au Brief IA       │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              [ Session Anonyme ]                            [ Compte Connecté ]
                      │                                               │
                      ▼                                     ┌─────────┴─────────┐
             PROHIBÉ (Pas de brief)                         ▼                   ▼
           CTA : Créer un compte par                  [ Site Non Vérifié ]   [ Site Vérifié ]
                  Magic Link                                │                   │
                                                            ▼                   ▼
                                                      Brief PARTIEL       Brief COMPLET
                                                    (Domaines Ouverts)  (Tous Domaines)
```

### Tableau de Synthèse des Droits

| Contexte / Statut Utilisateur | Vue Rapport HTML | Brief IA Téléchargeable / Copiable |
| :--- | :--- | :--- |
| **Anonyme (Sans compte)** | Soft-Gate Partiel (Détail 4 domaines + cadenas) | ❌ **Aucun brief.** Incitation Magic Link. |
| **Compte + Site non vérifié** | Soft-Gate Partiel (Détail 4 domaines + cadenas) | ⚠️ **Brief PARTIEL** (Préfixe : `Audixio Brief — PARTIEL (Site non vérifié)`) |
| **Compte + Site vérifié** | Vue Complète (8 domaines) | ✅ **Brief COMPLET** (Préfixe : `Audixio Brief — COMPLET (Site vérifié)`) |
| **Lien Public (30 jours)** | Vue Partielle + Bandeau avertissement permanent | ❌ **Aucun brief** (Protection anti-scraping). |
| **Lien Équipe (Collab / Freelance)** | Vue Lecture Seule selon statut vérif du proprio | ✅ **Brief Lecture Seule** (Inclus pour le destinataire, même sans compte). |

---

## 5. UI/UX & Règles d'Affichage Spécifiques

### 5.1 Écran des Priorités (Approche Mixte)
- Slot 1 & 2 : Priorités concrètes issues des domaines ouverts (ex: surpoids des images, balises meta manquantes).
- Slot 3 : Encart flouté/incitatif : *« 🔒 Une priorité critique de sécurité est masquée — Vérifiez la propriété de ce site pour l'afficher »*.

### 5.2 Bandeau Lien Public (30 jours)
Toute page de rapport partagée publiquement doit comporter le bandeau supérieur suivant :
> **Rapport public (vue limitée)** — Le propriétaire n'a pas vérifié ce site. Les analyses détaillées de Sécurité, Vie privée et DNS sont masquées.

### 5.3 Directive SEO
Toutes les routes de rapports publics non vérifiés doivent obligatoirement inclure la balise HTML :
```html
<meta name="robots" content="noindex, nofollow" />
```

---

## 6. Architecture Technique & Anti-Fuite (Backend / API)

### 6.1 Règle d'or du Filtrage
Le filtrage du soft-gate s'effectue exclusivement au niveau serveur (Netlify Functions / API Astro / Supabase RLS). 

```typescript
// Exemple de contrat de réponse TypeScript selon le contexte
type AuditResponse = 
  | {
      status: 'unverified';
      partialScore: number;
      openDomains: {
        performance: DomainDetails;
        seo: DomainDetails;
        ecology: DomainDetails;
        quality: DomainDetails;
        accessibility: A11yPartialDetails;
      };
      lockedDomains: {
        security: { status: 'LOCKED'; message: string };
        privacy: { status: 'LOCKED'; message: string };
        dns: { status: 'LOCKED'; message: string };
      };
    }
  | {
      status: 'verified';
      globalScore: number;
      allDomains: Record<DomainKey, DomainDetails>;
    };
```

### 6.2 Sécurité Supabase (RLS)
Les tables contenant les `findings` sensibles (`security_logs`, `privacy_scans`, `dns_audit_details`) et les `brief_payloads` complets doivent bloquer la lecture si `auth.uid()` ne correspond pas à un propriétaire vérifié ou un collaborateur approuvé.

### 6.3 Invalidation et Re-contrôle Dynamique
Lors de chaque requête sur un endpoint sensible ou lors de la régénération d'un brief :
1. Le serveur vérifie la présence et la validité de la preuve de propriété (DNS/fichier/balise).
2. Si la preuve est révoquée ou expirée, le statut bascule instantanément sur `unverified`, et les caches CDN/Edge sont purgés.

---

## 7. Plan d'Exécution & Prochaines Étapes

1. **Mise à jour des Documents Dépôt :** Injecter ces spécifications dans `docs/FONCTIONNEMENT.md` et `AGENTS.md`.
2. **Back-end :** Implémenter le middleware de réponse conditionnelle `unverified` vs `verified`.
3. **Front-end :** Aligner les composants UI (Double note, badges Verrouillé, priorités mixtes, bandeau public).
4. **Recette Sécurité :** Exécuter un audit DevTools/Network pour s'assurer qu'aucune clé sensible ne fuite dans les payloads JSON non vérifiés.
