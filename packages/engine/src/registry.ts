import { type Check, DOMAINS, type Domain, type Mode, NEEDS } from './types.js';

const ID_RE = /^([a-z_]+)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

export interface Registry {
  register(check: Check): void;
  get(id: string): Check | undefined;
  /** Checks triés par identifiant (ordre stable). */
  list(filter?: { domain?: Domain; mode?: Mode }): Check[];
  readonly size: number;
}

export function validateCheck(check: Check): void {
  const match = ID_RE.exec(check.id);
  if (!match) throw new Error(`Identifiant de check invalide : ${check.id}`);
  if (!DOMAINS.includes(check.domain))
    throw new Error(`Domaine inconnu pour ${check.id}`);
  if (match[1] !== check.domain)
    throw new Error(`${check.id} doit commencer par « ${check.domain}. »`);
  if (check.mode !== 'passive' && check.mode !== 'active')
    throw new Error(`Mode invalide pour ${check.id}`);
  if (![1, 2, 3].includes(check.weight))
    throw new Error(`Poids invalide pour ${check.id}`);
  if (
    new Set(check.needs).size !== check.needs.length ||
    check.needs.some((need) => !NEEDS.includes(need))
  )
    throw new Error(`Besoins invalides pour ${check.id}`);
  if (
    check.timeoutMs !== undefined &&
    !(Number.isFinite(check.timeoutMs) && check.timeoutMs > 0)
  )
    throw new Error(`Délai invalide pour ${check.id}`);
  if (typeof check.run !== 'function')
    throw new Error(`run manquant pour ${check.id}`);
}

export function createRegistry(initial: readonly Check[] = []): Registry {
  const checks = new Map<string, Check>();

  const registry: Registry = {
    register(check) {
      validateCheck(check);
      if (checks.has(check.id))
        throw new Error(`Check déjà enregistré : ${check.id}`);
      checks.set(check.id, check);
    },
    get: (id) => checks.get(id),
    list(filter = {}) {
      return [...checks.values()]
        .filter(
          (check) =>
            (filter.domain === undefined || check.domain === filter.domain) &&
            (filter.mode === undefined || check.mode === filter.mode),
        )
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    },
    get size() {
      return checks.size;
    },
  };
  for (const check of initial) registry.register(check);
  return registry;
}
