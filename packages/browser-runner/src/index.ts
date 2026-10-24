/**
 * Schéma de sortie du runner (PART-13).
 * L’exécution Playwright n’est pas dans ce paquet pour l’instant :
 * les checks vie privée lisent un rapport déjà produit.
 */
export {
  BROWSER_SCHEMA_VERSION,
  type BrowserAudit,
  type BrowserCmp,
  type BrowserCookie,
  type BrowserRequest,
  CMP_VENDORS,
  type CmpVendor,
  parseBrowserAudit,
  RESOURCE_TYPES,
  type ResourceType,
} from './schema.js';
