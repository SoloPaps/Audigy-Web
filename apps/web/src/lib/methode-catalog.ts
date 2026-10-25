export interface MethodeEntry {
  id: string;
  pass: string | null;
  criterion: string | null;
  citation: string | null;
  /** Ancre de /methode. Une seule des références déjà nommées dans METHODE. */
  href: string;
}

/** Aiguille qui doit déjà être dans le chapitre du test. Absent : pas de puce. */
const NEEDLE: Readonly<Record<string, string>> = {
  'securite.https': 'MDN HTTP Observatory',
  'securite.hsts': 'MDN HTTP Observatory',
  'securite.csp': 'MDN HTTP Observatory',
  'securite.xcto': 'MDN HTTP Observatory',
  'securite.frames': 'MDN HTTP Observatory',
  'securite.referrer': 'MDN HTTP Observatory',
  'securite.permissions': 'MDN HTTP Observatory',
  'securite.cookies': 'MDN HTTP Observatory',
  'securite.certificate': 'MDN HTTP Observatory',
  'securite.mixed': 'MDN HTTP Observatory',
  'securite.security_txt': 'MDN HTTP Observatory',
  'performance.lighthouse': 'PageSpeed Insights',
  'performance.lcp': 'CrUX',
  'performance.inp': 'CrUX',
  'performance.cls': 'CrUX',
  'performance.poids': 'Lighthouse',
  'performance.cache': 'Lighthouse',
  'performance.compression': 'Lighthouse',
  'seo.lighthouse': 'Lighthouse',
  'accessibilite.lighthouse': 'Lighthouse',
  'dns_email.spf': 'RFC 7208',
  'dns_email.mx': 'RFC 7505',
  'ecologie.ecoindex': 'https://www.ecoindex.fr/comment-ca-marche/',
  'ecologie.co2': 'Sustainable Web Design',
  'ecologie.hebergeur': 'thegreenwebfoundation.org',
  'ecologie.rgesn_polices': 'référentiel général d’écoconception',
  'ecologie.rgesn_images': 'référentiel général d’écoconception',
  'ecologie.rgesn_budget': 'référentiel général d’écoconception',
  'ecologie.rgesn_cache': 'référentiel général d’écoconception',
  'ecologie.rgesn_compression': 'référentiel général d’écoconception',
  'qualite.html': 'html-validate',
  'securite.cve_scripts': 'https://osv.dev/',
  'securite.cve_logiciels': 'https://nvd.nist.gov/developers/vulnerabilities',
  'vie_privee.traceurs': 'Tracker Radar',
  'vie_privee.cmp': 'Tracker Radar',
};

function cells(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return body.split('|').map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}/u.test(line.trim());
}

interface Table {
  header: string[];
  rows: string[][];
}

function tablesOf(section: string): Table[] {
  const lines = section.split('\n');
  const found: Table[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!(lines[index] ?? '').trim().startsWith('|')) {
      index += 1;
      continue;
    }
    const block: string[] = [];
    while (
      index < lines.length &&
      (lines[index] ?? '').trim().startsWith('|')
    ) {
      block.push(lines[index] ?? '');
      index += 1;
    }
    if (block.length < 2 || !isSeparator(block[1] ?? '')) continue;
    found.push({
      header: cells(block[0] ?? ''),
      rows: block
        .slice(2)
        .map(cells)
        .filter((row) => row.some((cell) => cell !== '')),
    });
  }
  return found;
}

function sectionsOf(markdown: string): string[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const cut = part.indexOf('\n');
      return cut === -1 ? '' : part.slice(cut + 1);
    });
}

const SOURCE_HREF: Readonly<Record<string, string>> = {
  'MDN HTTP Observatory': '/methode#method-observatory',
  Lighthouse: '/methode#method-lighthouse',
  'https://www.ecoindex.fr/comment-ca-marche/': '/methode#method-ecoindex',
  'Tracker Radar': '/methode#method-trackers',
};

/** Lien de méthode. DNS : le chapitre dit déjà « DNS sur HTTPS ». */
export function methodeHref(id: string, citation: string | null): string {
  if (citation !== null && SOURCE_HREF[citation] !== undefined) {
    return SOURCE_HREF[citation];
  }
  if (id.startsWith('dns_email.')) return '/methode#method-doh';
  return '/methode#method-repro';
}

function clean(value: string): string | null {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '' || text === '—') return null;
  return text;
}

export function parseMethodeCatalog(
  markdown: string,
): Map<string, MethodeEntry> {
  const catalog = new Map<string, MethodeEntry>();
  const criteria = new Map<string, string>();
  for (const section of sectionsOf(markdown)) {
    for (const table of tablesOf(section)) {
      const header = table.header.map((cell) =>
        cell.toLocaleLowerCase('fr-FR'),
      );
      if (
        header[0] !== 'critère' ||
        header[1] !== 'test' ||
        header[2] !== 'observation'
      ) {
        continue;
      }
      for (const row of table.rows) {
        const id = (row[1] ?? '').trim();
        if (id === '') continue;
        const text = `${row[0] ?? ''} — ${row[2] ?? ''}`
          .replace(/\s+/g, ' ')
          .trim();
        criteria.set(id, text);
      }
    }
    for (const table of tablesOf(section)) {
      if (
        !table.header.includes('Identifiant') ||
        !table.header.includes('Poids') ||
        !table.header.includes('Réussi')
      ) {
        continue;
      }
      const idAt = table.header.indexOf('Identifiant');
      const passAt = table.header.indexOf('Réussi');
      for (const row of table.rows) {
        const id = (row[idAt] ?? '').trim();
        if (!/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/u.test(id)) continue;
        const needle = NEEDLE[id];
        const citation =
          needle !== undefined && section.includes(needle) ? needle : null;
        catalog.set(id, {
          id,
          pass: clean(row[passAt] ?? ''),
          criterion: criteria.get(id) ?? null,
          citation,
          href: methodeHref(id, citation),
        });
      }
    }
  }
  return catalog;
}
