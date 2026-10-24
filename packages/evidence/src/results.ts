import { z } from 'zod';
import { EvidenceError } from './errors.js';
import { canonicaliser } from './jcs.js';

/**
 * `results.json` (PLAN §12.1).
 * Cible, IP résolue, empreinte du certificat TLS, UA, viewport,
 * versions (moteur, méthode, Lighthouse) et findings.
 */
export const resultatsSchema = z.strictObject({
  cible: z.string().url(),
  ip: z.string().min(1),
  certificatEmpreinte: z.string().regex(/^(?:[0-9a-f]{64})?$/),
  ua: z.string().min(1),
  viewport: z.strictObject({
    largeur: z.number().int().positive(),
    hauteur: z.number().int().positive(),
  }),
  versions: z.strictObject({
    moteur: z.string().min(1),
    methode: z.string().min(1),
    lighthouse: z.string().min(1),
  }),
  findings: z.array(z.unknown()),
});

export type Resultats = z.infer<typeof resultatsSchema>;

/** Texte canonique UTF-8 de `results.json`, sans saut de ligne final. */
export function resultatsCanoniques(valeur: Resultats): string {
  let json: unknown;
  try {
    json = JSON.parse(JSON.stringify(valeur)) as unknown;
  } catch {
    throw new EvidenceError('ENTREE', 'résultats non sérialisables');
  }
  const parsed = resultatsSchema.safeParse(json);
  if (!parsed.success) {
    throw new EvidenceError('ENTREE', 'résultats illisibles');
  }
  return canonicaliser(parsed.data);
}
