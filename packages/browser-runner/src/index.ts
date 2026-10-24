/**
 * @audigy/browser-runner — runner navigateur (PLAN §3, §6). Mode passif uniquement.
 *
 * API
 * - `runBrowserAudit({ url, fetch?, browser?, viewports?, botUrl? })` : Chromium, profil
 *   vierge, aucune interaction ; ordinateur (1920 × 1080, référence EcoIndex) puis
 *   téléphone (Pixel 7). Renvoie `{ result, screenshots, warc }` ; `result` est validé par
 *   `BrowserAuditResultSchema` (zod).
 *   Collecte : axe-core complet (règles actives par défaut) et correspondance RGAA
 *   partielle, traces et stockage avant consentement, requêtes tierces, plateforme de
 *   consentement (tarteaucitron, Axeptio, Didomi, Cookiebot, OneTrust…), erreurs
 *   console, contenu mixte dynamique, DOM / requêtes / poids pour EcoIndex, captures WebP
 *   horodatées (plafond 200 Ko). `warc: true` : WARC 1.1 de la page d’accueil (plafond 5 Mo).
 * - Anti-SSRF : chaque requête du navigateur est interceptée et rejouée par `safeFetch`
 *   (`@audigy/net`) ; le navigateur ne résout aucun nom (`LAUNCH_ARGS`). GET et HEAD
 *   seulement : un envoi reçoit une réponse vide locale et n'atteint pas le site.
 *   WebSocket refusés. Budget `BROWSER_BUDGET` (1 req/s par hôte).
 * - `launchBrowser()` : Chromium avec `LAUNCH_ARGS`, à partager entre plusieurs audits.
 * - `runJob(auditId, { store, run })`, `supabaseJobStore`, `jobStoreFromEnv` : exécution
 *   `browser-audit.yml` ; artefacts dans le seau privé `artifacts/<auditId>/browser/`,
 *   avec `manifest.json` (empreinte SHA-256). PDF via `renderPdf` (`page.pdf()`, 1 Mo).
 * - `RGAA_AXE_MAP`, `rgaaFromAxe` (`@audigy/browser-runner/rgaa`) : données
 *   `data/rgaa-axe-map.json`, couverture partielle déclarée.
 * - Schéma seul, sans Playwright : `@audigy/browser-runner/schema`.
 * - CLI : `audigy-browser audit <url>` (local) et `audigy-browser job <auditId>`.
 */
export {
  CMP_SIGNATURES,
  type CmpProbe,
  type CmpSignature,
  detectCmp,
} from './cmp.js';
export {
  createInterceptor,
  createResponseCache,
  fulfillHeaders,
  type Interceptor,
  type InterceptorOptions,
  MAX_RECORDS,
  type ResponseCache,
  type RouteLike,
} from './intercept.js';
export {
  AuditIdSchema,
  type JobArtifact,
  type JobAudit,
  JobError,
  type JobErrorCode,
  type JobOptions,
  type JobStore,
  type JobSummary,
  jobStoreFromEnv,
  runJob,
  supabaseJobStore,
} from './job.js';
export {
  collectConsole,
  collectMixedContent,
  normalizeCookies,
  parseMixedContent,
  summarizeAxe,
} from './observe.js';
export { PDF_PRINT, pdfContainsHex, pdfFromPage } from './pdf.js';
export { renderPrintHtml } from './print-html.js';
export {
  RGAA_AXE_MAP,
  type RgaaMap,
  RgaaMapSchema,
  rgaaFromAxe,
} from './rgaa.js';
export {
  BROWSER_BUDGET,
  type BrowserAuditOptions,
  type BrowserAuditOutput,
  LAUNCH_ARGS,
  launchBrowser,
  runBrowserAudit,
  type ScreenshotFile,
  type WarcFile,
} from './run.js';
export * from './schema.js';
export { cookieIsThirdParty, isThirdParty, siteOf } from './site.js';
export { buildHomepageWarc, HOMEPAGE_WARC, warcDate } from './warc.js';
