/** Dictionnaire anglais posé avant l’hydratation. Absent : le français reste. */

const SLOT = '__audigy_en';

type Bag = Record<string, string>;

function bag(): Bag | null {
  const value = (globalThis as Record<string, unknown>)[SLOT];
  if (!value || typeof value !== 'object') return null;
  return value as Bag;
}

export function packLine(key: string): string | null {
  const line = bag()?.[key];
  return typeof line === 'string' && line.length > 0 ? line : null;
}

export function installPack(next: Bag | null): void {
  const host = globalThis as Record<string, unknown>;
  if (next === null) {
    delete host[SLOT];
    return;
  }
  host[SLOT] = next;
}
