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
 *   `BROWSER_SHARED_KEY` : sortie du runner navigateur, pour les checks `needs: ['browser']`.
 * - `ENGINE_VERSION`, `METHOD_VERSION` : versions stockées sur chaque audit.
 * - `SECURITE_CHECKS` : checks passifs du domaine Sécurité (PART-06).
 * - `ACTIVE_SECURITE_CHECKS` : fichiers exposés, liste de dossier, versions TLS
 *   (PART-18). Un check `active` ne part que si `verified` est vrai.
 * - `generateToken`, `activeAllowed`, `probeOwnership`, `buildChallenge` :
 *   preuve de propriété (DNS TXT, fichier, balise), fraîcheur 10 min, portée.
 * - `DNS_EMAIL_CHECKS` : MX, SPF, DMARC, DKIM, CAA, DNSSEC, MTA-STS, TLS-RPT (PART-09).
 * - `PERFORMANCE_CHECKS` : laboratoire PSI (mobile + ordinateur) et terrain CrUX
 *   (adresse puis origine), stockés dans `ctx.shared` (`psi`, `crux`).
 * - `ACCESSIBILITE_CHECKS` : accès. Lighthouse lit `categories.accessibility`
 *   dans le lot `psi` de PART-07. Sans clé : Non testé (`missing_key`), sans appel.
 *   `accessibilite.axe` lit la sortie navigateur. Sans runner : Non testé.
 *   Ce n’est pas un audit RGAA complet.
 * - `SEO_CHECKS` : référencement. Lighthouse SEO lit le lot `psi` de PART-07.
 *   `robots.txt` et le plan du site sont hors portée quand l’audit est un chemin.
 *   Search Console (`needs: ['gsc']`) lit `ctx.net.gsc`. Sans jeton : Non testé.
 * - `ECOLOGIE_CHECKS` : EcoIndex, CO2.js (SWD v4), annuaire Green Web, sous-ensemble
 *   RGESN. Le poids et les requêtes viennent du même artefact PSI. Les chiffres sont
 *   des estimations. `parseRgesnResponses` valide le questionnaire. Une question
 *   sans réponse est absente, pas un échec.
 * - `QUALITE_CHECKS` : parcours borné (50 pages, robots, portée), liens internes
 *   et externes, HTML essentiel, images (poids, dimensions, format).
 * - `googleApiKey`, `withGoogleApi` : clé `GOOGLE_API_KEY` et client `@audigy/net`.
 * - `withExternalApi` : même client sans clé, pour Green Web, OSV, NVD et KEV.
 * - `TECHNOLOGIES_CHECKS`, `createTechnologiesChecks` : technologies (en-têtes `Server`,
 *   `X-Powered-By`, balise generator, signatures retire.js Apache-2.0 sur les scripts
 *   chargés), failles OSV (bibliothèques) et NVD (logiciels), croisées avec le catalogue
 *   KEV. Version inconnue : aucune alerte. Cache jour UTC. `nvdApiKey` lit `NVD_API_KEY`.
 * - `createReputationChecks` : avis Google (Places API New). Note et nombre d’avis,
 *   score hors du global. Cache 7 jours. Sans `PLACES_API_KEY`, le check n’est pas enregistré.
 * - `VIE_PRIVEE_CHECKS` : traceurs avant consentement (liste DuckDuckGo, licence
 *   CC BY-NC-SA 4.0), bannière, refus au premier niveau, scripts et polices tiers,
 *   mentions légales et confidentialité. Le rapport navigateur se lit dans
 *   `ctx.shared` sous la clé `browser` (schéma `@audigy/browser-runner`).
 *   Sans ce rapport, les checks navigateur sont « Non testé ».
 */

export {
  ACCESSIBILITE_CHECKS,
  type AccessibiliteCheckOptions,
  createAccessibiliteChecks,
} from '../checks/accessibilite/index.js';
export {
  createDisponibiliteChecks,
  DISPONIBILITE_CHECKS,
  judgeUptime,
  UPTIME_KEY,
  type UptimeSample,
} from '../checks/disponibilite/uptime.js';
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
export { createReputationChecks } from '../checks/reputation/index.js';
export {
  loadPlaceDetails,
  memoryPlacesCache,
  PLACES_CACHE_MS,
  type PlaceCandidate,
  type PlaceFacts,
  type PlacesCache,
  type PlacesFailure,
  parseCandidates,
  parseDetails,
  placesApiKey,
  pointsFromTenths,
  ratingFromTenths,
  reputationStatus,
  searchPlaces,
} from '../checks/reputation/places.js';
export { ACTIVE_SECURITE_CHECKS } from '../checks/securite/active.js';
export { SECURITE_CHECKS } from '../checks/securite/index.js';
export { EXPOSED_FILES, LISTING_DIRS } from '../checks/securite/signatures.js';
export {
  CVE_TIMEOUT_MS,
  createTechnologiesChecks,
  TECHNOLOGIES_CHECKS,
  TECHNOLOGIES_TIMEOUT_MS,
  type TechnologiesCheckOptions,
} from '../checks/securite/technologies/index.js';
export { SIGNATURES as RETIRE_SIGNATURES } from '../checks/securite/technologies/retire.js';
export { type GscPropertyRef, matchProperty } from '../checks/seo/gsc-match.js';
export { createSeoChecks, SEO_CHECKS } from '../checks/seo/index.js';
export { BROWSER_KEY, VIE_PRIVEE_CHECKS } from '../checks/vie_privee/index.js';
export { TRACKER_LIST } from '../checks/vie_privee/trackers.js';
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
export type {
  GscFailure,
  GscInspectResult,
  GscListResult,
  GscSitemapEntry,
  GscSnapshot,
  GscVerdict,
  SearchConsolePort,
} from './gsc.js';
export {
  activeAllowed,
  buildChallenge,
  type ChallengeView,
  challengeName,
  challengeValue,
  FRESH_MS,
  generateToken,
  isFresh,
  looksLikeHtml,
  metaContent,
  type OwnershipSite,
  type ProbeOutcome,
  type ProofRecord,
  probeOwnership,
  scopedUrl,
  scopesMatch,
  siteFromTarget,
  TOKEN_RE,
  VERIFICATION_METHODS,
  type VerificationMethod,
  verificationFileUrl,
} from './ownership.js';
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
export { BROWSER_SHARED_KEY, createSharedArtifacts } from './shared.js';
export {
  type Check,
  type CheckContext,
  type CheckOutcome,
  type CheckResult,
  DOMAINS,
  type Domain,
  ENGINE_VERSION,
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
