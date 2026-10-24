/**
 * @audigy/net — seul point de sortie réseau vers un site audité (PLAN §11).
 *
 * API
 * - `createSafeFetch(options?) → safeFetch(url, { method?: 'GET' | 'HEAD', accept?, signal? })`
 *   Anti-SSRF : http/https uniquement, ports 80/443, aucun identifiant dans l'URL ;
 *   résolution DNS puis refus de toute adresse non publique (privée, réservée, loopback,
 *   link-local dont 169.254.169.254, CGNAT 100.64/10, multicast, IPv6 ULA/link-local,
 *   IPv4 mappées en IPv6, notations décimale/octale/hexa) ; IP épinglée par hôte pour la
 *   durée de l'instance (anti DNS rebinding) ; revalidation à chaque redirection (max 5) ;
 *   réponse plafonnée (5 Mo HTML, 20 Mo sinon, 20 Mo au total via le budget) ;
 *   délai 10 s par requête ; aucun cookie ni identifiant envoyé ;
 *   `User-Agent: AudigyBot/1.0 (+<botUrl>/robot)`. Renvoie un `SafeResponse` (corps lu).
 * - `createRequestBudget(options?)` : ≤ 50 requêtes, 1 req/s par hôte, 20 Mo au total.
 * - `createDohResolver(options?)` : DNS sur HTTPS (JSON), `query(nom, type)` et `addresses(nom)`.
 * - `createTlsProbe(options?) → probeTls(hôte)` : connexion TLS au port 443 (IP publique
 *   épinglée) ; protocole, suite, validité de la chaîne, SAN, expiration (selon `now`).
 * - `createExternalApi(options?) → api.request({ method, url, body?, headers?, timeoutMs?, signal? })` :
 *   HTTPS vers une liste fermée d’API (PSI, CrUX, Green Web, OSV, NVD, KEV). POST permis,
 *   délai 120 s, pas de redirection, IP publique épinglée. `headers` ne remplace aucun
 *   en-tête du client. Ne sert pas à joindre le site audité.
 * - `blockedReason(ip)`, `isPublicAddress(ip)`, `parseIpv4Loose(hôte)`, `validateTargetUrl(url)`.
 *
 * Toute erreur est une `NetError` avec un `code` stable (`BLOCKED_ADDRESS`, `BLOCKED_PORT`,
 * `BLOCKED_SCHEME`, `TOO_MANY_REDIRECTS`, `RESPONSE_TOO_LARGE`, `TIMEOUT`…).
 * Les options `dial` et `ca` sont réservées aux tests (serveur local).
 */
export {
  createRequestBudget,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_MAX_TOTAL_BYTES,
  DEFAULT_PER_HOST_INTERVAL_MS,
  type RequestBudget,
  type RequestBudgetOptions,
} from './budget.js';
export {
  createDohResolver,
  DEFAULT_DOH_ENDPOINT,
  type DnsAnswer,
  type DnsRecord,
  type DnsType,
  type DohOptions,
  type DohResolver,
} from './doh.js';
export { isNetError, NetError, type NetErrorCode } from './errors.js';
export {
  createExternalApi,
  DEFAULT_EXTERNAL_MAX_BYTES,
  DEFAULT_EXTERNAL_TIMEOUT_MS,
  EXTERNAL_API_HOSTS,
  type ExternalApi,
  type ExternalApiOptions,
  type ExternalRequest,
  type ExternalResponse,
  GREEN_WEB_HOST,
  KEV_HOST,
  NVD_HOST,
  OSV_HOST,
} from './external-api.js';
export {
  blockedReason,
  isPublicAddress,
  parseIpv4Loose,
  parseIpv6,
} from './ip.js';
export {
  ALLOWED_PORTS,
  BOT_NAME,
  createSafeFetch,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_HTML_BYTES,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_TIMEOUT_MS,
  type SafeFetch,
  type SafeFetchInit,
  type SafeFetchOptions,
  type SafeResponse,
  userAgent,
  validateTargetUrl,
} from './safe-fetch.js';
export type { Dial, Resolve } from './target.js';
export {
  createTlsProbe,
  type TlsCertificateInfo,
  type TlsChainEntry,
  type TlsProbe,
  type TlsProbeOptions,
  type TlsProbeResult,
} from './tls-probe.js';
