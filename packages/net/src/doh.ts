import { NetError } from './errors.js';

export type DnsType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'NS'
  | 'TXT'
  | 'CAA'
  | 'SOA';

const TYPE_CODES: Record<DnsType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  CAA: 257,
};
const CODE_TYPES = new Map<number, DnsType>(
  Object.entries(TYPE_CODES).map(([k, v]) => [v, k as DnsType]),
);

export interface DnsRecord {
  name: string;
  type: DnsType;
  ttl: number;
  /** Donnée brute ; pour TXT, segments concaténés sans guillemets. */
  data: string;
}

export interface DnsAnswer {
  /** Code RCODE : 0 = NOERROR, 3 = NXDOMAIN. */
  status: number;
  /** Bit AD : réponse validée DNSSEC par le résolveur. */
  authenticated: boolean;
  records: DnsRecord[];
}

export interface DohResolver {
  query(name: string, type: DnsType): Promise<DnsAnswer>;
  /** Adresses A + AAAA ; utilisable comme `resolve` de `createSafeFetch`. */
  addresses(name: string): Promise<string[]>;
}

export interface DohOptions {
  /** Point d'accès DoH JSON (https uniquement). */
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export const DEFAULT_DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';
const MAX_DOH_BYTES = 64 * 1024;
const NAME_RE =
  /^(?=.{1,253}\.?$)([a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)*[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.?$/i;

export function createDohResolver(options: DohOptions = {}): DohResolver {
  const endpoint = new URL(options.endpoint ?? DEFAULT_DOH_ENDPOINT);
  if (endpoint.protocol !== 'https:')
    throw new NetError('BLOCKED_SCHEME', 'DoH exige https');
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 5000;

  async function query(name: string, type: DnsType): Promise<DnsAnswer> {
    if (!NAME_RE.test(name))
      throw new NetError('INVALID_URL', 'Nom DNS invalide');
    if (!(type in TYPE_CODES))
      throw new NetError('INVALID_URL', 'Type DNS invalide');
    const url = new URL(endpoint);
    url.searchParams.set('name', name);
    url.searchParams.set('type', type);
    let text: string;
    try {
      const res = await doFetch(url, {
        headers: { accept: 'application/dns-json' },
        redirect: 'error',
        credentials: 'omit',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new NetError('DNS_FAILURE', `DoH HTTP ${res.status}`);
      text = await res.text();
    } catch (error) {
      if (error instanceof NetError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new NetError('TIMEOUT', 'Délai DoH dépassé', { cause: error });
      }
      throw new NetError('DNS_FAILURE', 'Requête DoH impossible', {
        cause: error,
      });
    }
    if (text.length > MAX_DOH_BYTES)
      throw new NetError('RESPONSE_TOO_LARGE', 'Réponse DoH trop grande');
    return parseDohJson(text);
  }

  return {
    query,
    async addresses(name) {
      const [a, aaaa] = await Promise.all([
        query(name, 'A'),
        query(name, 'AAAA'),
      ]);
      return [...a.records, ...aaaa.records]
        .filter((r) => r.type === 'A' || r.type === 'AAAA')
        .map((r) => r.data);
    },
  };
}

function parseDohJson(text: string): DnsAnswer {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new NetError('DNS_FAILURE', 'Réponse DoH illisible', {
      cause: error,
    });
  }
  if (!isObject(json) || typeof json.Status !== 'number') {
    throw new NetError('DNS_FAILURE', 'Réponse DoH invalide');
  }
  const records: DnsRecord[] = [];
  const answers = Array.isArray(json.Answer) ? json.Answer : [];
  for (const raw of answers) {
    if (!isObject(raw)) continue;
    const { name, type, TTL, data } = raw;
    if (
      typeof name !== 'string' ||
      typeof type !== 'number' ||
      typeof data !== 'string'
    )
      continue;
    const known = CODE_TYPES.get(type);
    if (!known) continue;
    records.push({
      name: name.replace(/\.$/, ''),
      type: known,
      ttl: typeof TTL === 'number' ? TTL : 0,
      data: known === 'TXT' ? unquoteTxt(data) : data,
    });
  }
  return { status: json.Status, authenticated: json.AD === true, records };
}

function unquoteTxt(data: string): string {
  const segments = data.match(/"((?:[^"\\]|\\.)*)"/g);
  if (!segments) return data;
  return segments.map((s) => s.slice(1, -1).replace(/\\(.)/g, '$1')).join('');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
