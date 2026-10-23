import type { SharedArtifacts } from './types.js';

/** Mémorise la promesse par clé : un artefact n'est chargé qu'une fois, même en concurrence. */
export function createSharedArtifacts(): SharedArtifacts {
  const cache = new Map<string, Promise<unknown>>();
  return {
    get<T>(key: string, load: () => Promise<T>): Promise<T> {
      let pending = cache.get(key) as Promise<T> | undefined;
      if (!pending) {
        pending = Promise.resolve().then(load);
        cache.set(key, pending);
      }
      return pending;
    },
    has: (key) => cache.has(key),
  };
}
