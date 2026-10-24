/** L’adresse est-elle dans la portée de l’audit ? */
export function inScope(
  target: URL,
  scope: 'origin' | 'path',
  url: URL,
): boolean {
  if (url.origin !== target.origin) return false;
  if (scope === 'origin') return true;
  return pathCovers(target.pathname, url.pathname);
}

/**
 * Une page à parcourir : dossier, adresse sans extension, ou document HTML.
 * Les autres fichiers sont des liens, pas des pages.
 */
export function looksLikePage(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  if (path.endsWith('/')) return true;
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (!last.includes('.')) return true;
  return /\.xhtml$/.test(last) || /\.html?$/.test(last);
}

function pathCovers(scopePath: string, candidate: string): boolean {
  const withSlash = scopePath.endsWith('/') ? scopePath : `${scopePath}/`;
  const exact = scopePath.endsWith('/') ? scopePath.slice(0, -1) : scopePath;
  if (candidate === scopePath || candidate === exact) return true;
  return candidate.startsWith(withSlash);
}
