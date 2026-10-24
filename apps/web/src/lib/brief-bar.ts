import { t } from '../i18n/brief-fr.js';

export type CatalogStatus = 'pass' | 'warn' | 'fail' | 'untested' | 'na';

export interface BarInput {
  failCount: number;
  warnCount: number;
  passCount: number;
  selectedCount: number;
}

export interface BarState {
  visible: boolean;
  allClear: boolean;
  generateEnabled: boolean;
  failsEnabled: boolean;
  hint: boolean;
}

export function selectionLabel(count: number): string {
  if (count === 1) return t('brief.count.one');
  return t('brief.count.many', { n: count });
}

export function generatedLive(count: number): string {
  return t('brief.live', { n: count });
}

export function barState(input: BarInput): BarState {
  const actionable = input.failCount + input.warnCount > 0;
  return {
    visible: actionable,
    allClear: !actionable && input.passCount > 0,
    generateEnabled: input.selectedCount > 0,
    failsEnabled: input.failCount > 0,
    hint: actionable && input.selectedCount === 0,
  };
}

export function failsOf(
  rows: readonly { id: string; catalogStatus: CatalogStatus }[],
): string[] {
  return rows
    .filter((row) => row.catalogStatus === 'fail')
    .map((row) => row.id);
}
