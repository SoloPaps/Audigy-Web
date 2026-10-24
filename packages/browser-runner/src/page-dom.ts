/**
 * Types minimaux du DOM pour les fonctions exécutées dans la page (`page.evaluate`).
 * Le dépôt compile sans `lib: dom` : ces fonctions n'accèdent au DOM que par
 * `globalThis as unknown as PageWindow`. Elles sont sérialisées par Playwright et ne
 * doivent référencer aucune variable du module.
 */
export interface PageElement {
  readonly tagName: string;
  readonly shadowRoot: PageParent | null;
  readonly textContent: string | null;
  readonly value?: string;
  getAttribute(name: string): string | null;
  getBoundingClientRect(): { width: number; height: number };
  querySelectorAll(selector: string): ArrayLike<PageElement>;
}

export interface PageParent {
  querySelectorAll(selector: string): ArrayLike<PageElement>;
}

export interface PageStorage {
  readonly length: number;
  key(index: number): string | null;
}

export interface PageWindow {
  readonly document: PageParent & {
    querySelector(selector: string): PageElement | null;
    getElementsByTagName(name: string): ArrayLike<PageElement>;
  };
  readonly localStorage: PageStorage;
  readonly sessionStorage: PageStorage;
  getComputedStyle(el: PageElement): { visibility: string; display: string };
  [name: string]: unknown;
}
