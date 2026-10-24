/** Pages HTML lues au plus pendant le parcours passif. */
export const PAGE_LIMIT = 50;
/** Liens externes sondés au plus, en HEAD. */
export const EXTERNAL_LIMIT = 30;
/** Au-dessus, l’image est lourde. */
export const IMAGE_MAX_BYTES = 200 * 1024;
/** Le parcours peut attendre le budget (50 × 1 s) avant le délai du check. */
export const QUALITE_TIMEOUT_MS = 90_000;
/** Jeton robots.txt du robot Audigy. */
export const AUDIGY_AGENT = 'audigybot';

export const QUALITY_KEY = 'qualite.crawl';

/**
 * Règles html-validate essentielles : structure du document,
 * pas le style ni l’accessibilité.
 */
export const ESSENTIAL_RULES = [
  'close-attr',
  'close-order',
  'doctype-html',
  'element-permitted-content',
  'element-permitted-occurrences',
  'element-permitted-order',
  'element-permitted-parent',
  'element-required-ancestor',
  'element-required-content',
  'missing-doctype',
  'no-dup-attr',
  'no-raw-characters',
  'unrecognized-char-ref',
  'void-content',
] as const;
