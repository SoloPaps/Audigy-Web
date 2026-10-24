import type { PageWindow } from './page-dom.js';

/** Éléments du DOM, sans les descendants des `svg` (méthode EcoIndex). Exécuté dans la page. */
export function countDomInPage(): number {
  const win = globalThis as unknown as PageWindow;
  const all = win.document.getElementsByTagName('*').length;
  let insideSvg = 0;
  for (const svg of Array.from(win.document.getElementsByTagName('svg')))
    insideSvg += svg.querySelectorAll('*').length;
  return all - insideSvg;
}

/** Clés (jamais les valeurs) du stockage local et de session. Exécuté dans la page. */
export function storageKeysInPage(): {
  localStorage: string[];
  sessionStorage: string[];
} {
  const win = globalThis as unknown as PageWindow;
  const keys = (read: () => PageWindow['localStorage']): string[] => {
    try {
      const store = read();
      const out: string[] = [];
      for (let i = 0; i < store.length && out.length < 200; i += 1) {
        const key = store.key(i);
        if (key !== null) out.push(key.slice(0, 256));
      }
      return out;
    } catch {
      return [];
    }
  };
  return {
    localStorage: keys(() => win.localStorage),
    sessionStorage: keys(() => win.sessionStorage),
  };
}
