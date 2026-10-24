/**
 * @audigy/engine — cœur du moteur d'audit (PLAN §5). Pur : aucun accès réseau ni disque
 * direct, tout passe par `ctx.net` (`@audigy/net`) et des adaptateurs injectés.
 *
 * API
 * - Types §5.1 : `Check`, `CheckContext`, `CheckResult`, `CheckOutcome`, `Domain`, `Status`…
 * - `createRegistry(checks?)` : enregistre et valide les checks (id `<domaine>.<nom>`, unique).
 * - `runChecks(checks, ctx, { concurrency?, timeoutMs?, available? })` : concurrence bornée,
 *   délai par check ; `active` jamais exécuté si `ctx.verified !== true` ; erreur, délai,
 *   source absente ou résultat invalide → `untested` avec une raison (`REASONS`, clés i18n).
 * - `scoreDomain`, `scoreDomains`, `scoreGlobal`, `levelFor`, `prioritize` : score §5.2.
 * - `runAudit(checks, ctx, options?)` : rapport déterministe (`methodVersion` 2026.1).
 * - `parseFix`, `loadFixes(store)`, `variantFor` : fiches §5.3. Lecture disque :
 *   `fileFixStore(dir?)` depuis `@audigy/engine/fixes-fs`.
 * - `createSharedArtifacts()` : artefacts chargés une seule fois par audit.
 * - `SECURITE_CHECKS` : checks passifs du domaine Sécurité (PART-06).
 * - `DNS_EMAIL_CHECKS` : MX, SPF, DMARC, DKIM, CAA, DNSSEC, MTA-STS, TLS-RPT (PART-09).
 * - `PERFORMANCE_CHECKS` : laboratoire PSI (mobile + ordinateur) et terrain CrUX
 *   (adresse puis origine), stockés dans `ctx.shared` (`psi`, `crux`).
 * - `SEO_CHECKS` : référencement. Lighthouse SEO lit le lot `psi` de PART-07.
 *   `robots.txt` et le plan du site sont hors portée quand l’audit est un chemin.
 * - `ECOLOGIE_CHECKS` : EcoIndex, CO2.js (SWD v4), annuaire Green Web, sous-ensemble
 *   RGESN. Le poids et les requêtes viennent du même artefact PSI. Les chiffres sont
 *   des estimations. `parseRgesnResponses` valide le questionnaire (pas d’interface).
 * - `QUALITE_CHECKS` : parcours borné (50 pages, robots, portée), liens internes
 *   et externes, HTML essentiel, images (poids, dimensions, format).
 * - `googleApiKey`, `withGoogleApi` : clé `GOOGLE_API_KEY` et client `@audigy/net`.
 * - `withExternalApi` : même client sans clé, pour Green Web, OSV, NVD et KEV.
 * - `TECHNOLOGIES_CHECKS`, `createTechnologiesChecks` : technologies (en-têtes `Server`,
 *   `X-Powered-By`, balise generator, signatures retire.js Apache-2.0 sur les scripts
 *   chargés), failles OSV (bibliothèques) et NVD (logiciels), croisées avec le catalogue
 *   KEV. Version inconnue : aucune alerte. Cache jour UTC. `nvdApiKey` lit `NVD_API_KEY`.
 */

export { DKIM_SELECTORS, DNS_EMAIL_CHECKS } from '../checks/dns_email/index.js';
export {
  CO2_LIBRARY,
  CO2_MODEL,
  CO2_VERSION,
  type Co2Rating,
  estimateVisit,
  type VisitEstimate,
} from '../checks/ecologie/co2.js';
export {
  computeEcoIndex,
  ECOINDEX_BYTES_PER_KB,
  ECOINDEX_GRADES,
  ECOINDEX_QUANTILE_TABLE,
  type EcoGrade,
  type EcoIndexInput,
  type EcoIndexValue,
  gradeOf,
  sizeKbFromBytes,
} from '../checks/ecologie/ecoindex.js';
export {
  createEcologieChecks,
  ECOLOGIE_CHECKS,
  type EcologieCheckOptions,
} from '../checks/ecologie/index.js';
export {
  parseRgesnResponses,
  RGESN_ANSWERS,
  RGESN_QUESTIONS,
  RGESN_THEMES,
  RGESN_VERSION,
  type RgesnAnswer,
  type RgesnProgress,
  type RgesnQuestion,
  type RgesnResponse,
  RgesnSchemaError,
  type RgesnTheme,
  rgesnProgress,
  rgesnQuestion,
} from '../checks/ecologie/questionnaire.js';
export {
  CRUX_SHARED_KEY,
  type CruxBundle,
  createPerformanceChecks,
  PERFORMANCE_CHECKS,
  PSI_SHARED_KEY,
  type PsiBundle,
} from '../checks/performance/index.js';
export { QUALITE_CHECKS } from '../checks/qualite/index.js';
export { SECURITE_CHECKS } from '../checks/securite/index.js';
export {
  CVE_TIMEOUT_MS,
  createTechnologiesChecks,
  TECHNOLOGIES_CHECKS,
  TECHNOLOGIES_TIMEOUT_MS,
  type TechnologiesCheckOptions,
} from '../checks/securite/technologies/index.js';
export { SIGNATURES as RETIRE_SIGNATURES } from '../checks/securite/technologies/retire.js';
export { createSeoChecks, SEO_CHECKS } from '../checks/seo/index.js';
export { type AuditReport, runAudit } from './audit.js';
export { nvdApiKey, withExternalApi } from './external.js';
export {
  FIX_VARIANTS,
  FixParseError,
  type FixSheet,
  type FixSource,
  type FixStore,
  type FixVariant,
  loadFixes,
  parseFix,
  variantFor,
} from './fixes.js';
export { googleApiKey, withGoogleApi } from './google-api.js';
export { createRegistry, type Registry, validateCheck } from './registry.js';
export {
  DEFAULT_AVAILABLE,
  DEFAULT_CHECK_TIMEOUT_MS,
  DEFAULT_CONCURRENCY,
  REASONS,
  type RunOptions,
  runChecks,
} from './runner.js';
export {
  type DomainScore,
  type GlobalScore,
  type Level,
  levelFor,
  MIN_COVERAGE,
  prioritize,
  resultValue,
  scoreDomain,
  scoreDomains,
  scoreGlobal,
} from './score.js';
export { createSharedArtifacts } from './shared.js';
export {
  type Check,
  type CheckContext,
  type CheckOutcome,
  type CheckResult,
  DOMAINS,
  type Domain,
  type Hosting,
  MAIN_DOMAINS,
  METHOD_VERSION,
  type Mode,
  NEEDS,
  type Need,
  type RunContext,
  type SharedArtifacts,
  STATUSES,
  type Status,
  type Target,
} from './types.js';
