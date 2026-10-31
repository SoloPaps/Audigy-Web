# Index maquettes

Maquettes Stitch UX (lot initial 27 oct. 2026 + **rapport 5 écrans 28 oct. 2026**). Un dossier = un écran desktop (`screen.png` + `code.html`).

**Référence visuelle Cursor :** ouvrir **les deux** fichiers ensemble. Body = HTML+CSS Stitch **structure pixel-perfect** ; shell (header/footer/logo) = composants partagés NAV-CANON / FOOTER-CANON ; logo = `../logos/audixio-logos/out/` (PC lockup clair header). Marque **Audixio**.

**Doctrine 28 oct soir :** Stitch = structure **COMPLET**. Droits manquants → composants **Verrouillé** (voir `../MATRICE-STATUT-DROITS-CANON.md`), **pas** une 2ᵉ maquette hub PARTIEL. Mock = démo ; produit = capabilities serveur. Remap palette pétrole/pêche, Inter shell, lettres A–F (pas /100 comme système UI).

## Rapport (canon 28 oct — Stitch pack)

| Dossier | Écran | Rôle |
|---------|--------|------|
| `page_rapport_hub/` | Hub rapport | Note + TOP 10 titres + 8 cartes domaines + CTA Brief hors page |
| `page_domaine_ouvert/` | Domaine ouvert (template Perf) | Constations, filtres, sélection Rien/Vérif/Fix |
| `page_domaine_verrouille/` | Domaine verrouillé (template Sécurité) | Pattern **Verrouillé** — adoucir teaser (pas HSTS/X-Frame dans aperçu locked) |
| `page_brief_ia/` | Brief / config prompt IA | Sélection sync + ton/stack + aperçu / générer / copier |
| `page_detail_constat/` | Détail d’un constat | Fiche problème simplifiée |

ZIP source : `stitch-rapport-2026-10-28.zip`. Notes design Stitch : `DESIGN-STITCH-RAPPORT-2026-10-28.md` (couleurs Stitch ≠ tokens produit).

## Pages (autres)

| Dossier | Écran |
|---------|--------|
| `page_accueil/` | Accueil (préférence : URL search + Audit CTA) |
| `page_methode_bareme/` | Méthode & barème |
| `page_site_suivi/` | Sites suivis |
| `page_connexion/` | Connexion |
| `page_lien_email_envoye/` | Magic link envoyé |
| `page_compte/` | Mon compte |
| `page_progression/` | Progression audit |
| `page_rapport_lecture/` | Lien équipe · lecture seule |
| `page_exemple_rapport/` | Exemple / démo publique (≠ soft-gate exact) |
| `page_verifier_propriete/` | Vérifier propriété (page) |
| `page_acceptation_acces/` | Acceptation propriétaire |
| `pages_historique_monsite/` | Historique Pro |
| `page_pro/` | Audixio Pro waitlist |
| `page_404/` | 404 |
| `page_ecologie/` | Questionnaire éco RGESN |
| `page_mentions_legales/` | Mentions légales |
| `page_politique_confidentialite/` | Confidentialité |
| `page_conditions_utilisation/` | CGU |
| `page_accessibilite/` | Accessibilité |

## Interfaces / modales

| Dossier | Écran |
|---------|--------|
| `interface_demande_acces/` | Demande d'accès (modale soft-gate) |
| `interface_verifier_propriete/` | Variante / UI vérifier |
| `interface_guide_correction/` | Guide de correction (générique ; ex. HSTS **uniquement** si droit / guide public générique) |

## Notes pack

- Soft-gate public : pas de dossier séparé ; structure démo ≈ `page_exemple_rapport/` **mais soft-gate ≠ exemple produit** — écarts = `restes-a-faire-par-page-Cursor.md` + matrice.
- Lien équipe = `page_rapport_lecture/` (≠ soft-gate).
- Anciens dossiers `audigy_*` retirés — ne plus les citer.
- Pas de mobile par page (responsive Cursor). PNG idéalement ≥ 1000 px de large.
- Chrome canon : `NAV-CANON-desktop-et-mobile.md` + `FOOTER-CANON-compact.md` (préférences owner « Audit rapide » pastille = optionnelle, voir RESTES ; **NAV-CANON actuel = canon** tant que non figé autrement).

## Obsoletes

Dossiers déplacés dans obsoletes/ (ne plus utiliser pour Cursor) :

| Dossier | Raison |
|---------|--------|
| obsoletes/page_rapport_audit/ | Legacy hub rapport pré-28 oct — remplacé par page_rapport_hub + sous-pages domaine |
| obsoletes/interface_promptIA/ | Modale Brief IA legacy — remplacé par page_brief_ia/ |
