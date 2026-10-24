import { type MethodeEntry, parseMethodeCatalog } from './methode-catalog.js';

const files = import.meta.glob('../../../../docs/METHODE.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

let cached: Map<string, MethodeEntry> | null = null;

export function methodeCatalog(): ReadonlyMap<string, MethodeEntry> {
  if (cached) return cached;
  const text = Object.values(files)[0];
  if (typeof text !== 'string') {
    throw new Error('catalogue méthode absent');
  }
  cached = parseMethodeCatalog(text);
  return cached;
}
