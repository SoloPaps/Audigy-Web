import serialize from 'canonicalize';
import { EvidenceError } from './errors.js';

type Canon = (valeur: unknown) => string | undefined;

const canoniser: Canon =
  typeof serialize === 'function'
    ? serialize
    : (serialize as { default: Canon }).default;

/**
 * JSON Canonicalization Scheme (RFC 8785).
 * Le texte renvoyé est exactement les octets UTF-8 à hacher.
 */
export function canonicaliser(valeur: unknown): string {
  const texte = canoniser(valeur);
  if (texte === undefined) {
    throw new EvidenceError('ENTREE', 'valeur impossible à canoniser');
  }
  return texte;
}
