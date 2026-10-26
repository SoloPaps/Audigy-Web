# Audigy — Pages & écrans (canon D+M)

**Base Stitch5 :** `/tmp/audigy-stitch5/stitch_audigy_web_audit_platform/`  
**Preuves :** `/tmp/audigy-stitch4/AUDIT.md` (ne rien inventer hors checklist ci-dessous).  
**Règle doublons :** 1 desktop + 1 mobile **canon** ; les autres = archive / variante.

Chemin court = nom de dossier sous la base Stitch5.

---

## 1. Accueil

| | |
|--|--|
| **Objectif** | Entrée wow + confiance : URL → audit gratuit sans compte |
| **Desktop canon** | `audigy_accueil_combin_desktop` |
| **Mobile canon** | `audigy_accueil_combin_mobile` |
| **Dark** | Appliquer tokens `04` ; ref visuelle `assets/dark-ref-accueil.png` |

### Checklist OBLIGATOIRE

- [ ] Hero + champ URL + CTA pétrole « Lancer l’audit »
- [ ] **8 domaines** (pas 6) : Sécurité & En-têtes · Performance & CWV · Éco-conception · Accessibilité · Vie privée & Trackers · Disponibilité · Stack & Vulnérabilités · SEO Technique & Search Console
- [ ] **3 liens** : Comment ça marche · Voir un exemple de rapport · Guide pour corriger
- [ ] Skip link « Aller au formulaire d’audit »
- [ ] Nav canon + logos assets (pas Material)

---

## 2. Rapport d’audit

| | |
|--|--|
| **Objectif** | Verdict MonScore + sélection Audigy (Rien/Vérif/Fix) + brief |
| **Desktop canon** | `audigy_rapport_d_audit_complet_desktop_conforme` |
| **Mobile canon** | `audigy_rapport_d_audit_complet_mobile_conforme` (HTML OK ; **PNG 28 o CASSÉ** — ignorer) |
| **Archiver (pas nav)** | `audigy_rapport_desktop_avec_brief_ia_sauvegarde` — famille **B** ; évent. extraire seule la modale « sauvegarder » |

### Checklist OBLIGATOIRE

- [ ] Note globale **A–F** (+ /100 + label)
- [ ] Exactement **3 priorités** en tête
- [ ] Tri-état **Rien / Vérif / Fix** par constat
- [ ] **8 domaines** structurés
- [ ] Filtres **Tous / À corriger / Succès**
- [ ] Bandeau **résolution estimée** (ex. ~50 min)
- [ ] **Copier le lien** du rapport + toast
- [ ] Brief IA : aperçu markdown + toast ; **Télécharger AUDIGY-FIXES.md**
- [ ] Barre bas fixe (compteur constats · Fix · Vérif + CTA brief)
- [ ] Nav canon (jamais famille B)

---

## 3. Progression (OK + 403)

| | |
|--|--|
| **Objectif** | Flux d’audit rassurant + état accès partiel / WAF 403 |
| **Desktop canon** | `audigy_progression_de_l_audit_desktop_harmonis` |
| **Mobile canon** | `audigy_progression_de_l_audit_mobile_pur_sans_cadre` |
| **Variante pédagogique D** | `audigy_progression_de_l_audit_desktop_chec_partiel` — **retirer** item nav `Progression` |
| **Dark** | Ref `assets/dark-ref-progression.png` |

### Checklist OBLIGATOIRE

- [ ] Étapes nommées (pas logs bruts)
- [ ] État **403** / WAF / accès partiel visible
- [ ] **SANS** item Progression dans la nav globale
- [ ] Nav canon + logos assets

---

## 4. Connexion

| | |
|--|--|
| **D** | `audigy_connexion_desktop` |
| **M** | `audigy_connexion_mobile` — **corriger** bottom-bar Diagnostic… |

### Checklist

- [ ] Formulaire connexion / magic link selon produit
- [ ] Remplacer bottom-bar par drawer 5 items
- [ ] Nav canon

---

## 5. Vérifier la propriété

| | |
|--|--|
| **D** | `audigy_v_rifier_la_propri_t_desktop` |
| **M** | `audigy_v_rifier_la_propri_t_mobile` — corriger bottom-bar |

### Checklist

- [ ] Parcours preuve de propriété (DNS / meta / fichier)
- [ ] Drawer = nav canon

---

## 6. Questionnaire éco RGESN

| | |
|--|--|
| **D** | `audigy_questionnaire_co_rgesn_desktop` |
| **M** | `audigy_questionnaire_co_rgesn_mobile` — corriger bottom-bar |

### Checklist

- [ ] Questions pratiques RGESN hors scan
- [ ] Nav canon

---

## 7. Guide de correction

| | |
|--|--|
| **Desktop canon** | `audigy_guide_de_correction_desktop_tats_de_v_rification` (états interactifs) |
| **Mobile canon** | `audigy_guide_de_correction_mobile` |
| **Archive si redondant** | `audigy_guide_de_correction_desktop` (simple) |

### Checklist

- [ ] Étapes + états de vérification
- [ ] Nav canon

---

## 8. Soft-gate (rapport partagé public)

| | |
|--|--|
| **D** | `audigy_rapport_partag_public_soft_gating_desktop` |
| **M** | `audigy_rapport_partag_public_soft_gating_mobile` |

### Checklist

- [ ] Score visible ; détail sensible soft-gated
- [ ] Copie lien, opt-out, CTA compte
- [ ] Nav canon

---

## 9. Méthode / barème

| | |
|--|--|
| **D** | `audigy_m_thode_de_calcul_bar_me_desktop` |
| **M** | `audigy_m_thode_de_calcul_bar_me_mobile` — éviter drift « Compte » à la place de Connexion |

### Checklist

- [ ] Barème public + « ce qu’on ne fait jamais »
- [ ] Nav canon (Connexion, pas Compte en 5ᵉ item)

---

## 10. Sites suivis

| | |
|--|--|
| **D** | `audigy_sites_suivis_tableau_de_bord_desktop` |
| **M** | `audigy_sites_suivis_tableau_de_bord_mobile` |

### Checklist

- [ ] Tableau de bord sites (UI shell — multi-sites+GSC = hors scope data)
- [ ] Nav canon

---

## 11. Compte / contact

| | |
|--|--|
| **D** | `audigy_votre_compte_contact_desktop_anim` |
| **M** | `audigy_votre_compte_contact_mobile_anim` — compléter nav |

### Checklist

- [ ] Infos compte / contact
- [ ] **Pas** multi-sites+GSC dans ce lot
- [ ] Nav canon

---

## 12. Mentions légales

| | |
|--|--|
| **D** | `audigy_mentions_l_gales_desktop` |
| **M** | `audigy_mentions_l_gales_mobile` — nav souvent I (FR/EN only) → reprendre |

### Checklist

- [ ] Contenu légal ; nav canon D+M

---

## 13. Politique de confidentialité

| | |
|--|--|
| **D** | `audigy_politique_de_confidentialit_desktop_anim` |
| **M** | `audigy_politique_de_confidentialit_mobile_anim` |

### Checklist

- [ ] Contenu ; nav canon

---

## 14. Déclaration d’accessibilité

| | |
|--|--|
| **D** | `audigy_d_claration_d_accessibilit_desktop_anim` |
| **M** | `audigy_d_claration_d_accessibilit_mobile_anim` |

### Checklist

- [ ] Contenu ; nav canon

---

## 15. Conditions d’utilisation (CGU)

| | |
|--|--|
| **D** | `audigy_conditions_d_utilisation_desktop_anim` |
| **M** | `audigy_conditions_d_utilisation_mobile_anim` |

### Checklist

- [ ] Contenu ; nav canon

---

## Design system (pas une page produit)

| Dossier | Usage |
|---------|--------|
| `audigy_arc_pure` | `DESIGN.md` → copié dans `refs/DESIGN-stitch-arc-pure.md` |

---

## Inventaire Stitch5 (33 HTML + DESIGN)

Accueil D/M · Connexion D/M · Vérifier D/M · Éco D/M · Guide D / D-états / M · Progression desktop harmonisé · Progression mobile pur · Progression desktop échec partiel · Rapport conforme D/M · Rapport brief sauvegarde D · Soft-gate D/M · Méthode D/M · Sites D/M · Compte D/M · Mentions D/M · Conf D/M · A11y D/M · CGU D/M · `audigy_arc_pure`.

**Ne pas zipper ces HTML dans le pack.** Chemins ci-dessus suffisent si `/tmp/audigy-stitch5` est dispo sur la machine.
