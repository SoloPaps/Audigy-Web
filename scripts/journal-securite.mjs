// Journal de sécurité LOCAL. Interroge GitHub avec ton compte (outil `gh`)
// et ajoute une section datée dans securite-local/JOURNAL.md.
// Le dossier securite-local/ est ignoré par Git : rien n'est jamais publié.
// Usage : pnpm securite:journal [propriétaire/dépôt]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DOSSIER = 'securite-local';
const JOURNAL = `${DOSSIER}/JOURNAL.md`;
const ETAT = `${DOSSIER}/etat.json`;
const ORDRE = ['critical', 'high', 'medium', 'low', 'warning', 'note', 'error', 'inconnue'];

function depot() {
  const arg = process.argv[2];
  if (arg) return arg;
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const m = url.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  if (!m) throw new Error(`Dépôt GitHub introuvable dans « ${url} ». Passe-le en argument.`);
  return m[1];
}

// Renvoie { items } ou { erreur }. Une ligne JSON par alerte (jq tojson).
function lire(chemin) {
  try {
    const sortie = execFileSync(
      'gh',
      ['api', '--paginate', chemin, '--jq', '.[] | tojson'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const items = sortie
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l));
    return { items };
  } catch (e) {
    const brut = `${e.stderr ?? ''}${e.message ?? ''}`;
    return { erreur: brut.split('\n').find((l) => l.trim() !== '') ?? 'erreur inconnue' };
  }
}

function gravite(valeur) {
  return String(valeur ?? 'inconnue').toLowerCase();
}

function normaliser(source, a) {
  if (source === 'code') {
    return {
      id: `code-${a.number}`,
      source: 'CodeQL / Semgrep',
      gravite: gravite(a.rule?.security_severity_level ?? a.rule?.severity),
      titre: a.rule?.description ?? a.rule?.id ?? 'alerte',
      lieu: `${a.most_recent_instance?.location?.path ?? '?'}:${a.most_recent_instance?.location?.start_line ?? '?'}`,
      url: a.html_url,
    };
  }
  if (source === 'dependances') {
    return {
      id: `dep-${a.number}`,
      source: 'Dépendances',
      gravite: gravite(a.security_advisory?.severity),
      titre: `${a.dependency?.package?.name ?? '?'} : ${a.security_advisory?.summary ?? 'alerte'}`,
      lieu: a.dependency?.manifest_path ?? '?',
      url: a.html_url,
    };
  }
  // Secrets : on n'écrit JAMAIS la valeur du secret, seulement son type.
  return {
    id: `secret-${a.number}`,
    source: 'Secrets',
    gravite: 'critical',
    titre: a.secret_type_display_name ?? a.secret_type ?? 'secret détecté',
    lieu: '(voir le lien)',
    url: a.html_url,
  };
}

function comptes(alertes) {
  const par = {};
  for (const a of alertes) par[a.gravite] = (par[a.gravite] ?? 0) + 1;
  const cles = Object.keys(par).sort((x, y) => ORDRE.indexOf(x) - ORDRE.indexOf(y));
  return cles.length === 0 ? 'aucune' : cles.map((c) => `${par[c]} ${c}`).join(' · ');
}

function main() {
  const repo = depot();
  const sources = [
    ['code', `repos/${repo}/code-scanning/alerts?state=open&per_page=100`],
    ['dependances', `repos/${repo}/dependabot/alerts?state=open&per_page=100`],
    ['secrets', `repos/${repo}/secret-scanning/alerts?state=open&per_page=100`],
  ];

  const toutes = [];
  const problemes = [];
  for (const [nom, chemin] of sources) {
    const r = lire(chemin);
    if (r.erreur) problemes.push(`${nom} : ${r.erreur}`);
    else for (const a of r.items) toutes.push(normaliser(nom, a));
  }

  // Rien ne répond : on n'écrit pas un relevé « 0 alerte » trompeur.
  if (problemes.length === sources.length) {
    for (const p of problemes) console.log(`⚠ ${p}`);
    console.log('Aucune source accessible : journal non modifié. Vérifie `gh auth status`.');
    process.exitCode = 1;
    return;
  }

  mkdirSync(DOSSIER, { recursive: true });
  const avant = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : null;
  const ids = toutes.map((a) => a.id);
  const nouvelles = avant ? toutes.filter((a) => !avant.ids.includes(a.id)) : [];
  const corrigees = avant ? avant.ids.filter((i) => !ids.includes(i)) : [];

  const maintenant = new Date();
  const date = maintenant.toISOString().slice(0, 10);
  const heure = maintenant.toTimeString().slice(0, 5);

  const lignes = [];
  lignes.push('', '---', '', `## ${date} ${heure}`, '');
  lignes.push(`Dépôt : ${repo}`, '');
  lignes.push(`- Ouvertes : ${toutes.length} (${comptes(toutes)})`);
  if (avant) {
    lignes.push(`- Nouvelles depuis le ${avant.date} : ${nouvelles.length}`);
    lignes.push(`- Corrigées depuis le ${avant.date} : ${corrigees.length}`);
  } else {
    lignes.push('- Premier relevé : pas de comparaison.');
  }
  for (const p of problemes) lignes.push(`- ⚠ Source inaccessible, ${p}`);
  lignes.push('');

  if (toutes.length > 0) {
    lignes.push('| Gravité | Source | Alerte | Lieu | Lien |', '|---|---|---|---|---|');
    const tri = [...toutes].sort((x, y) => ORDRE.indexOf(x.gravite) - ORDRE.indexOf(y.gravite));
    for (const a of tri) {
      const nouveau = nouvelles.some((n) => n.id === a.id) ? ' 🆕' : '';
      const titre = a.titre.replaceAll('|', '/').replaceAll('\n', ' ');
      lignes.push(`| ${a.gravite}${nouveau} | ${a.source} | ${titre} | ${a.lieu} | ${a.url} |`);
    }
    lignes.push('');
  }

  const entete = existsSync(JOURNAL)
    ? ''
    : '# Journal de sécurité (local, jamais commité)\n';
  writeFileSync(JOURNAL, `${existsSync(JOURNAL) ? readFileSync(JOURNAL, 'utf8') : entete}${lignes.join('\n')}\n`);
  // Relevé partiel : on garde l'ancien état pour ne pas fausser « nouvelles / corrigées ».
  if (problemes.length === 0) writeFileSync(ETAT, JSON.stringify({ date, ids }, null, 2));

  console.log(`Journal mis à jour : ${JOURNAL}`);
  console.log(`Ouvertes : ${toutes.length} (${comptes(toutes)})`);
  for (const p of problemes) console.log(`⚠ ${p}`);
}

main();
