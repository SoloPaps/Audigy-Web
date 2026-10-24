import type {
  PsiOk,
  PsiPageFacts,
  PsiStrategyResult,
} from '../performance/types.js';

export const EMPTY_PAGE: PsiPageFacts = {
  bytes: null,
  requests: null,
  domElements: null,
  fontFiles: null,
  fontBytes: null,
  rasterImages: null,
  efficientImages: null,
};

export interface LabPage {
  strategy: 'mobile' | 'desktop';
  /** L’autre mesure ne permet pas le même calcul. */
  single: boolean;
  facts: PsiPageFacts;
}

/** Mesure de laboratoire la plus complète, puis la plus lourde. Égalité : téléphone. */
export function labPage(bundle: PsiOk): LabPage | null {
  const sides = [bundle.mobile, bundle.desktop].filter(
    (side): side is PsiStrategyResult => side !== null,
  );
  if (sides.length === 0) return null;
  const ranked = [...sides].sort(byUsefulness);
  const best = ranked[0];
  if (!best) return null;
  const otherComplete = sides.some(
    (side) => side !== best && ecoComplete(side),
  );
  return {
    strategy: best.strategy,
    single: !otherComplete,
    facts: best.page ?? EMPTY_PAGE,
  };
}

function byUsefulness(a: PsiStrategyResult, b: PsiStrategyResult): number {
  const complete = Number(ecoComplete(b)) - Number(ecoComplete(a));
  if (complete !== 0) return complete;
  const known = knownCount(b) - knownCount(a);
  if (known !== 0) return known;
  const bytes = (b.page?.bytes ?? -1) - (a.page?.bytes ?? -1);
  if (bytes !== 0) return bytes;
  return a.strategy === 'mobile' ? -1 : 1;
}

function ecoComplete(side: PsiStrategyResult): boolean {
  const page = side.page;
  if (!page) return false;
  return (
    page.bytes !== null && page.requests !== null && page.domElements !== null
  );
}

function knownCount(side: PsiStrategyResult): number {
  const page = side.page;
  if (!page) return 0;
  return [page.bytes, page.requests, page.domElements].filter(
    (value) => value !== null,
  ).length;
}
