# Registre des traitements

> **Mise à jour du 29/10/2026 (réorganisation des docs)** — ces décisions priment sur le texte ci-dessous (détail : [00-DECISIONS.md](../00-DECISIONS.md)) :
> - Connexion = **e-mail + mot de passe**, ou **Google / GitHub**. Plus de magic link.

Statut : relecture humaine par le propriétaire **non faite**. Ces textes ne sont pas validés. Ne pas les présenter comme relus.

Date de rédaction : 24 oct. 2026.  
Responsable : particulier non professionnel, publié sous le nom « Audixio ». L’identité civile est communiquée à l’hébergeur, pas sur le site.  
Contact : Audixio@outlook.fr  
Site visé : https://audixio.fr

Aucun traceur tiers. Le seul stockage local est la session de connexion. Pas de bannière cookies.

## 1. Compte et audits

| | |
|---|---|
| Finalité | Fournir l’audit gratuit, le suivi et les alertes demandées. |
| Données | Courriel, profil, sites, vérifications, audits, notes, constats, rapports, planification, disponibilité, incidents, alertes, lieu confirmé, acceptation des CGU (version et date). |
| Base | Exécution des conditions. Intérêt légitime pour le journal de sécurité. |
| Destinataires | La personne titulaire du compte. Sous-traitants ci-dessous. |
| Durée | Résultats : tant que le compte existe. Captures et PDF : 12 mois. WARC : seulement sur demande de rapport probant, 12 mois. |
| Transfert | Stockage dans l’Union européenne (Supabase). Traitement des fonctions aux États-Unis, Ohio (Netlify), accepté pour la v1. |

La suppression du compte efface les lignes et les fichiers du seau privé `artifacts`. Le journal dont cette personne est l’acteur est effacé avant la suppression du compte.

## 2. Preuve

Les artefacts (JSON, PDF, capture, WARC, jeton d’horodatage, signature) sont privés. L’export JSON décrit leurs métadonnées. Il ne contient pas le jeton OAuth chiffré.

Les rapports rappellent qu’ils ne sont pas un constat de commissaire de justice, et que l’horodatage RFC 3161 n’est pas qualifié au sens d’eIDAS (articles 41.1 et 41.2).

## 3. Connexion Google (facultative)

| | |
|---|---|
| Finalité | Lire Search Console pour le site relié, si la personne le demande. |
| Données | Jeton de rafraîchissement chiffré (AES-256-GCM). La clé n’est pas en base. |
| Durée | Jusqu’à la révocation ou la suppression du compte. |
| Export | Le fichier JSON indique seulement le fournisseur, jamais le secret. |

## 4. Courriel

Les e-mails de compte (confirmation d'inscription, mot de passe oublié), les alertes et le résumé hebdo passent par Brevo (France). Le désabonnement en un clic coupe le résumé.

## 5. Sous-traitants

| Acteur | Rôle | Lieu |
|---|---|---|
| Supabase Pte. Ltd. | Base et fichiers | Union européenne |
| Netlify, Inc., 101 2nd Street, San Francisco, CA 94105 | Hébergement du site et fonctions | États-Unis (fonctions : Ohio) |
| Brevo | Envoi des e-mails | France |
| Google | Vitesse, terrain, Search Console, avis, si activés | Selon Google |
| GitHub Actions | Navigateur d’audit, quand il est lancé | États-Unis |

L’hébergeur du site ne publie pas de numéro de téléphone. Contact publié : support@netlify.com.

## 6. Tests actifs

La CGU (version enregistrée dans `terms_acceptances`) fait déclarer que la personne est propriétaire du site, ou mandatée par écrit, avant un test actif. Référence : article 323-1 du code pénal.

Version des CGU en vigueur dans le code : `2026.1` (`TERMS_VERSION`).
