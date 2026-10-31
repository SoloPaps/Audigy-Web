# Structure docs — 28 octobre 2026 (soir)

**Machine :** OrdiBibi (`C:\Projets\Audigy-Web`)  
**Mode :** local only — **aucun** `git commit` / `git push`  
**Owner message :** ranger vraiment (pas inventaire passif)

---

## Avant → après

### Avant (problèmes)

- `docs/README.md` obsolète : liens morts (`bugs-a-reprendre`, `REFERENCE-AUDIGY…`, `superpowers/README`, `_spec-soft-gate`, `refs/`)
- Audit / prune / journal-corrections éparpillés (racine docs + design-pack)
- Dossiers vides bruit : `Temp/`, `_audixio-doc-fixes-tmp/`, `attachment-staging/`
- Chemins morts cités partout : `docs/_archive/…`, `docs/_spec-soft-gate-…`, `design-pack/…/refs/`
- `PLAN.md` / `METHODE.md` / lab docs sans banner « historique / ne pas contredire DECISIONS »
- `archive/README.md` encore flou (pas « ne pas utiliser pour Cursor »)
- Racine polluée par `local-exec-*.json` (tooling Grok Bot)

### Après (structure)

```
docs/
  README.md                          ← carte projet (ordre Cursor + owner)
  FONCTIONNEMENT.md                  ← SSOT produit (inchangé chemin)
  DECISIONS-OWNER-2026-10-28-soir.md ← SSOT décisions (inchangé)
  RECAP-ETAPES-PROJET-AUDIXIO.md     ← récap owner (inchangé)
  DESIGN.md / PLAN.md / METHODE.md / DEV-LOCAL.md / RECETTE.md / QUESTIONS.md
  design-pack-2026-10-26/            ← canons UI (chemins préservés)
  etapes-refonte/                    ← chemins préservés
  journal/                           ← NOUVEAU (audits / prune / corrections / STRUCTURE)
  archive/                           ← historique ; README « ne pas utiliser pour Cursor »
  legal/
```

Canons SSOT / design-pack / etapes-refonte **non déplacés** (contrainte Cursor rules + AGENTS).

---

## Déplacés

| De | Vers |
|----|------|
| `docs/AUDIT-ALIGNEMENT-2026-10-28-soir.md` | `docs/journal/AUDIT-ALIGNEMENT-2026-10-28-soir.md` |
| `docs/PRUNE-DOCS-2026-10-28.md` | `docs/journal/PRUNE-DOCS-2026-10-28.md` |
| `docs/design-pack-2026-10-26/journal-corrections-docs-2026-10-28.md` | `docs/journal/journal-corrections-docs-2026-10-28.md` (+ stub pointeur dans design-pack) |
| `local-exec-*.json`, gates, `.grokbot-data-root-v1` (10 fichiers) | `.local-grokbot/` (+ entrée `.gitignore`) |

**Total déplacés :** 3 docs → journal + 10 tooling → `.local-grokbot/` (+ 1 stub pointeur créé).

---

## Supprimés

| Élément | Raison |
|---------|--------|
| `Temp/` | vide (staging) |
| `_audixio-doc-fixes-tmp/` | vide |
| `attachment-staging/` | vide |
| `docs/superpowers/` | déjà absent (contenu dans `archive/superpowers/`) |

**Total dossiers inutiles retirés :** 3  
Non touchés : `node_modules`, `.git`, `apps`, `packages`, `supabase`, `.env`

---

## Trous / imprécisions corrigés

1. **Banners historique** : `PLAN.md`, `METHODE.md`, `DEV-LOCAL.md`, `RECETTE.md`, `QUESTIONS.md` → ne pas contredire DECISIONS / FONCTIONNEMENT / MATRICE / SOFT-GATE.
2. **Liens cassés `_archive` / `_spec-soft-gate`** retargetés vers `docs/archive/2026-10-28-prune/_spec-soft-gate-2026-10-28/` dans : AGENTS, FONCTIONNEMENT, SOFT-GATE, MATRICE, 00-LISEZ-MOI, couleurs-palette, journal files, etapes `07`.
3. **`refs/` morts** → `docs/archive/audigy-titled-2026-10-28/…` dans DESIGN, 01-REGLES, 03/04 THEME, etapes `03-theme-dark`, 00-LISEZ-MOI (07/08/refs marqués archivés).
4. **`docs/README.md`** réécrit = carte 1 page (ordre lecture Cursor + owner, canons, journal, archive, rappels anti-trou).
5. **`archive/README.md`** = « ne pas utiliser pour Cursor » + table chemins morts.
6. **`journal/README.md`** + **`STRUCTURE-2026-10-28.md`** (ce fichier).
7. **DECISIONS** : pointeur journal-corrections → `docs/journal/…`.
8. **Rappels produit** (carte README) : preuves MVP fichier+meta+lien HTML ; hub COMPLET+lock ; A11y mention ; VP partielle HTTP/HTML ; Comment réparer générique vs branché ; Pro ~9 €.

*(Les canons FONCTIONNEMENT / DECISIONS / MATRICE / SOFT-GATE / AGENTS étaient déjà alignés sur ces points produit — correction = liens + banners + carte, pas réécriture produit.)*

---

## Restants / hors scope volontaire

- Pas de dossier `docs/produit/` (évite cascade de liens ; bannières à la racine docs à la place).
- Contenu `archive/**` non réécrit (historique volontaire).
- Nombreux fichiers déjà modifiés / untracked d’**autres** sessions (logos, maquettes, rules…) — **pas** de commit.
- Logs locaux `.netlify-dev.*.log`, `.rg-path.txt` toujours à la racine (bruit ; non critiques).
- Stub `design-pack/…/journal-corrections-….md` reste (pointeur) pour ne pas casser d’anciens liens relatifs.

---

## Confirmations

- **Git commit / push :** aucun (dernier commit inchangé : `ea5bceb`).
- **Chemins AGENTS / `.cursor/rules` canons :** préservés (`FONCTIONNEMENT`, `DECISIONS`, `RECAP`, `DESIGN`, `design-pack/**`, `etapes-refonte/`, `PLAN`, `QUESTIONS`).
- **Seul changement AGENTS path :** `_archive/…` → `archive/2026-10-28-prune/…` (lien mort corrigé).