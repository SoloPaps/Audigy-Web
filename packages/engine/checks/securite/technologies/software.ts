/**
 * Liste maison des logiciels lus dans les en-têtes et la balise generator.
 * Pas d’empreintes Wappalyzer (licence GPL) : seulement des noms annoncés.
 */
export type SoftwareRole =
  | 'server'
  | 'language'
  | 'cms'
  | 'framework'
  | 'tool'
  | 'host';

export type CveSource =
  | { kind: 'nvd'; cpe: string }
  | { kind: 'osv'; ecosystem: 'npm'; name: string };

export type SoftwareOrigin =
  | 'server'
  | 'x-powered-by'
  | 'x-aspnet-version'
  | 'x-aspnetmvc-version'
  | 'x-generator'
  | 'generator';

interface SoftwareRule {
  id: string;
  label: string;
  role: SoftwareRole;
  /** Nom du produit dans `Server` ou `X-Powered-By`. */
  token?: RegExp;
  /** Balise generator ou `X-Generator` ; groupe 1 = version. */
  generator?: RegExp;
  /** Version assez précise pour comparer. Sinon : pas d’alerte. */
  precise?: RegExp;
  cve?: CveSource;
}

export interface SoftwareHit {
  id: string;
  label: string;
  role: SoftwareRole;
  origin: SoftwareOrigin;
  /** Version annoncée, telle quelle (nettoyée). */
  announced: string | null;
  /** Version amont, sans suffixe de distribution. */
  version: string | null;
  precise: boolean;
  /** Paquet de distribution : correctifs possibles sans changer le numéro. */
  distro: boolean;
  cve: CveSource | null;
}

const THREE = /^\d+\.\d+\.\d+$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9a-z]+(?:\.[0-9a-z]+)*)?$/i;
const VERSION_TOKEN = /^v?(\d+(?:\.\d+)*[a-z]{0,2})(.*)$/i;

/** Noms CPE vérifiés sur NVD le 24/10/2026 (nginx est classé sous f5). */
export const SOFTWARE_RULES: readonly SoftwareRule[] = [
  {
    id: 'apache',
    label: 'Apache',
    role: 'server',
    token: /^apache$/i,
    precise: THREE,
    cve: { kind: 'nvd', cpe: 'apache:http_server' },
  },
  {
    id: 'nginx',
    label: 'nginx',
    role: 'server',
    token: /^nginx$/i,
    precise: THREE,
    cve: { kind: 'nvd', cpe: 'f5:nginx' },
  },
  {
    id: 'openresty',
    label: 'OpenResty',
    role: 'server',
    token: /^openresty$/i,
  },
  {
    id: 'litespeed',
    label: 'LiteSpeed',
    role: 'server',
    token: /^litespeed$/i,
  },
  { id: 'iis', label: 'IIS', role: 'server', token: /^microsoft-iis$/i },
  { id: 'caddy', label: 'Caddy', role: 'server', token: /^caddy$/i },
  {
    id: 'php',
    label: 'PHP',
    role: 'language',
    token: /^php$/i,
    precise: THREE,
    cve: { kind: 'nvd', cpe: 'php:php' },
  },
  {
    id: 'openssl',
    label: 'OpenSSL',
    role: 'server',
    token: /^openssl$/i,
    precise: /^\d+\.\d+\.\d+[a-z]{0,2}$/,
    cve: { kind: 'nvd', cpe: 'openssl:openssl' },
  },
  { id: 'aspnet', label: 'ASP.NET', role: 'framework', token: /^asp\.net$/i },
  { id: 'express', label: 'Express', role: 'framework', token: /^express$/i },
  {
    id: 'nextjs',
    label: 'Next.js',
    role: 'framework',
    token: /^next\.js$/i,
    precise: SEMVER,
    cve: { kind: 'osv', ecosystem: 'npm', name: 'next' },
  },
  { id: 'netlify', label: 'Netlify', role: 'host', token: /^netlify$/i },
  {
    id: 'github',
    label: 'GitHub Pages',
    role: 'host',
    token: /^github\.com$/i,
  },
  { id: 'vercel', label: 'Vercel', role: 'host', token: /^vercel$/i },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    role: 'host',
    token: /^cloudflare$/i,
  },
  { id: 'amazons3', label: 'Amazon S3', role: 'host', token: /^amazons3$/i },
  {
    id: 'wordpress',
    label: 'WordPress',
    role: 'cms',
    generator: /^wordpress(?:\s+v?(\d[\w.-]*))?/i,
    precise: /^\d+\.\d+(?:\.\d+)?$/,
    cve: { kind: 'nvd', cpe: 'wordpress:wordpress' },
  },
  {
    id: 'drupal',
    label: 'Drupal',
    role: 'cms',
    generator: /^drupal(?:\s+(\d[\w.-]*))?/i,
  },
  { id: 'joomla', label: 'Joomla', role: 'cms', generator: /^joomla!?/i },
  {
    id: 'typo3',
    label: 'TYPO3',
    role: 'cms',
    generator: /^typo3(?:\s+(\d[\w.-]*))?/i,
  },
  {
    id: 'prestashop',
    label: 'PrestaShop',
    role: 'cms',
    generator: /^prestashop/i,
  },
  {
    id: 'ghost',
    label: 'Ghost',
    role: 'cms',
    generator: /^ghost(?:\s+v?(\d[\w.-]*))?/i,
    precise: SEMVER,
    cve: { kind: 'osv', ecosystem: 'npm', name: 'ghost' },
  },
  { id: 'wix', label: 'Wix', role: 'host', generator: /^wix\.com/i },
  {
    id: 'squarespace',
    label: 'Squarespace',
    role: 'host',
    generator: /^squarespace/i,
  },
  { id: 'webflow', label: 'Webflow', role: 'host', generator: /^webflow/i },
  {
    id: 'hugo',
    label: 'Hugo',
    role: 'tool',
    generator: /^hugo(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'jekyll',
    label: 'Jekyll',
    role: 'tool',
    generator: /^jekyll(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'gatsby',
    label: 'Gatsby',
    role: 'tool',
    generator: /^gatsby(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'astro',
    label: 'Astro',
    role: 'tool',
    generator: /^astro(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'eleventy',
    label: 'Eleventy',
    role: 'tool',
    generator: /^eleventy(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'hexo',
    label: 'Hexo',
    role: 'tool',
    generator: /^hexo(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'docusaurus',
    label: 'Docusaurus',
    role: 'tool',
    generator: /^docusaurus(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'vuepress',
    label: 'VuePress',
    role: 'tool',
    generator: /^vuepress(?:\s+v?(\d[\w.-]*))?/i,
  },
  {
    id: 'mkdocs',
    label: 'MkDocs',
    role: 'tool',
    generator: /^mkdocs(?:-(\d[\w.-]*))?/i,
  },
];

const DISTRO_COMMENT =
  /\b(ubuntu|debian|raspbian|centos|red ?hat|rhel|fedora|suse|opensuse|amazon|almalinux|rocky|oracle linux|alpine|gentoo|arch linux)\b/i;
const DISTRO_SUFFIX =
  /(ubuntu|deb\d|debian|dfsg|\bel\d|\.el\d|fc\d\d|amzn|fips|suse|sles|alpine|\+deb|~deb)/i;

/** Retire les caractères de contrôle et borne la longueur. */
export function tidy(value: string, max = 60): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    out += code <= 31 || code === 127 ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}

interface Product {
  name: string;
  version: string | null;
  comments: string[];
}

/** `Server` : `produit[/version] (commentaire) …` (RFC 9110 §10.2.4). */
export function parseProducts(header: string): Product[] {
  const products: Product[] = [];
  const src = tidy(header, 300);
  let index = 0;
  while (index < src.length) {
    const ch = src[index] as string;
    if (ch === ' ' || ch === ',') {
      index += 1;
      continue;
    }
    if (ch === '(') {
      let depth = 0;
      let end = index;
      for (; end < src.length; end += 1) {
        if (src[end] === '(') depth += 1;
        else if (src[end] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const comment = src.slice(index + 1, end);
      products[products.length - 1]?.comments.push(comment);
      if (products.length === 0)
        products.push({ name: '', version: null, comments: [comment] });
      index = end + 1;
      continue;
    }
    let end = index;
    while (end < src.length && !' ,('.includes(src[end] as string)) end += 1;
    const token = src.slice(index, end);
    index = end;
    const slash = token.indexOf('/');
    const name = slash === -1 ? token : token.slice(0, slash);
    const version = slash === -1 ? null : token.slice(slash + 1) || null;
    const last = products[products.length - 1];
    if (
      version === null &&
      last &&
      last.version === null &&
      last.name !== '' &&
      VERSION_TOKEN.test(name)
    ) {
      last.version = name;
      continue;
    }
    products.push({ name, version, comments: [] });
  }
  return products.filter((item) => item.name !== '');
}

function split(announced: string | null): {
  version: string | null;
  suffix: string;
} {
  if (announced === null) return { version: null, suffix: '' };
  const match = VERSION_TOKEN.exec(announced);
  if (!match) return { version: null, suffix: announced };
  return { version: match[1] as string, suffix: match[2] as string };
}

function hit(
  rule: SoftwareRule,
  origin: SoftwareOrigin,
  announced: string | null,
  distroHint: boolean,
): SoftwareHit {
  const clean = announced === null ? null : tidy(announced, 40) || null;
  const { version, suffix } = split(clean);
  const distro = distroHint || DISTRO_SUFFIX.test(suffix);
  const precise = version !== null && rule.precise?.test(version) === true;
  return {
    id: rule.id,
    label: rule.label,
    role: rule.role,
    origin,
    announced: clean,
    version,
    precise,
    distro,
    cve: rule.cve ?? null,
  };
}

function unknown(
  name: string,
  origin: SoftwareOrigin,
  announced: string | null,
): SoftwareHit {
  const label = tidy(name, 40);
  const clean = announced === null ? null : tidy(announced, 40) || null;
  return {
    id: `autre:${label.toLowerCase()}`,
    label,
    role: 'framework',
    origin,
    announced: clean,
    version: split(clean).version,
    precise: false,
    distro: false,
    cve: null,
  };
}

/** `X-Powered-By` : éléments séparés par des virgules, `nom/version` ou `nom version`. */
export function parsePoweredBy(header: string): Product[] {
  const products: Product[] = [];
  for (const part of tidy(header, 300).split(',')) {
    const item = part.trim();
    if (item === '') continue;
    const comments: string[] = [];
    const bare = item
      .replace(/\(([^()]*)\)/g, (_all, comment: string) => {
        comments.push(comment);
        return ' ';
      })
      .trim();
    const match = /^(.*?)(?:\s*\/\s*|\s+)v?(\d[\w.+~-]*)$/i.exec(bare);
    if (match && (match[1] as string).trim() !== '') {
      products.push({
        name: (match[1] as string).trim(),
        version: match[2] as string,
        comments,
      });
    } else {
      const slash = bare.indexOf('/');
      products.push({
        name: slash === -1 ? bare : bare.slice(0, slash),
        version: slash === -1 ? null : bare.slice(slash + 1) || null,
        comments,
      });
    }
  }
  return products.filter((item) => item.name !== '');
}

/** Produits d’un en-tête `Server` ou `X-Powered-By`. */
export function softwareFromHeader(
  header: string,
  origin: 'server' | 'x-powered-by',
): SoftwareHit[] {
  const products =
    origin === 'server' ? parseProducts(header) : parsePoweredBy(header);
  const distro = products.some((item) =>
    item.comments.some((comment) => DISTRO_COMMENT.test(comment)),
  );
  return products.map((product) => {
    const rule = SOFTWARE_RULES.find((item) => item.token?.test(product.name));
    return rule
      ? hit(rule, origin, product.version, distro)
      : unknown(product.name, origin, product.version);
  });
}

/** Valeur d’une balise generator ou de `X-Generator`. */
export function softwareFromGenerator(
  value: string,
  origin: 'generator' | 'x-generator',
): SoftwareHit | null {
  const text = tidy(value, 120);
  if (text === '') return null;
  for (const rule of SOFTWARE_RULES) {
    if (!rule.generator) continue;
    const match = rule.generator.exec(text);
    if (match) return hit(rule, origin, match[1] ?? null, false);
  }
  const named = /^(.*?)\s+v?(\d+(?:\.\d+)+)\b/.exec(text);
  return named
    ? unknown(named[1] as string, origin, named[2] as string)
    : unknown(text, origin, null);
}

/** `X-AspNet-Version` et `X-AspNetMvc-Version` : version seule. */
export function softwareFromAspNet(
  value: string,
  origin: 'x-aspnet-version' | 'x-aspnetmvc-version',
): SoftwareHit {
  const rule = SOFTWARE_RULES.find(
    (item) => item.id === 'aspnet',
  ) as SoftwareRule;
  return hit(rule, origin, value, false);
}
