/** Cache jour : clé = API + cible + jour UTC. Réponses seulement, jamais la clé d’API. */
export interface DayCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export function memoryDayCache(): DayCache {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
  };
}

export function cacheKey(api: string, target: string, day: string): string {
  return `${api}|${target}|${day}`;
}

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function readCache(cache: DayCache, key: string): unknown {
  const raw = cache.get(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
