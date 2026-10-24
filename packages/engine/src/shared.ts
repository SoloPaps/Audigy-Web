import type { SharedArtifacts } from './types.js';

/** Sortie du runner navigateur dans `ctx.shared`, lue par les checks `needs: ['browser']`. */
export const BROWSER_SHARED_KEY = 'browser';

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
