import { z } from 'zod';
import map from '../data/rgaa-axe-map.json' with { type: 'json' };
import type { AxeSummary, RgaaStatus, RgaaSummary } from './schema.js';

export const RgaaMapSchema = z.strictObject({
  rgaaVersion: z.string(),
  axeVersion: z.string(),
  criteriaTotal: z.number().int().positive(),
  coverage: z.literal('partial'),
  note: z.string().min(1),
  criteria: z
    .array(
      z.strictObject({
        id: z.string().regex(/^\d{1,2}\.\d{1,2}$/),
        title: z.string().min(1),
        rules: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});
export type RgaaMap = z.infer<typeof RgaaMapSchema>;

/** Correspondance RGAA 4.1 ↔ axe-core, partielle et déclarée comme telle. */
export const RGAA_AXE_MAP: RgaaMap = RgaaMapSchema.parse(map);

/**
 * Statut automatique de chaque critère couvert. `fail` : une règle échoue.
 * `incomplete` : axe demande une vérification. `passed_auto` : les règles passent,
 * le critère reste à vérifier à la main. `inapplicable` : rien à tester sur la page.
 */
export function rgaaFromAxe(
  axe: AxeSummary,
  rgaaMap: RgaaMap = RGAA_AXE_MAP,
): RgaaSummary {
  const failed = new Set(axe.violations.map((r) => r.id));
  const incomplete = new Set(axe.incomplete.map((r) => r.id));
  const passed = new Set(axe.passes);
  const inapplicable = new Set(axe.inapplicable);
  return {
    version: rgaaMap.rgaaVersion,
    criteriaTotal: rgaaMap.criteriaTotal,
    criteriaMapped: rgaaMap.criteria.length,
    coverage: 'partial',
    criteria: rgaaMap.criteria.map((criterion) => {
      const failedRules = criterion.rules.filter((rule) => failed.has(rule));
      let status: RgaaStatus;
      if (failedRules.length > 0) status = 'fail';
      else if (criterion.rules.some((rule) => incomplete.has(rule)))
        status = 'incomplete';
      else if (criterion.rules.some((rule) => passed.has(rule)))
        status = 'passed_auto';
      else if (criterion.rules.every((rule) => inapplicable.has(rule)))
        status = 'inapplicable';
      else status = 'not_run';
      return {
        id: criterion.id,
        status,
        rules: [...criterion.rules],
        failedRules,
      };
    }),
  };
}
