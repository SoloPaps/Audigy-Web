import {
  checkServerIdentity,
  connect,
  type DetailedPeerCertificate,
  type SecureVersion,
} from 'node:tls';
import { isNetError, NetError } from './errors.js';
import {
  type Dial,
  directDial,
  normalizeHost,
  pinAddress,
  type Resolve,
  systemResolve,
} from './target.js';

export interface TlsCertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  /** Jours restants avant expiration (négatif si expiré). */
  daysRemaining: number;
  expired: boolean;
  notYetValid: boolean;
  /** Noms alternatifs (SAN), ex. `DNS:exemple.fr`. */
  san: string[];
  fingerprint256: string;
}

export interface TlsChainEntry {
  subject: string;
  issuer: string;
  validTo: string;
  selfSigned: boolean;
}

export interface TlsProbeResult {
  host: string;
  ip: string;
  port: number;
  /** Protocole négocié, ex. `TLSv1.3`. */
  protocol: string | null;
  cipher: string | null;
  /** Chaîne validée par les autorités de confiance. */
  authorized: boolean;
  authorizationError: string | null;
  /** Le nom d'hôte figure dans le SAN du certificat. */
  hostnameMatches: boolean;
  certificate: TlsCertificateInfo;
  /** Chaîne présentée, feuille en premier. */
  chain: TlsChainEntry[];
}

export interface TlsProbeOptions {
  resolve?: Resolve;
  timeoutMs?: number;
  now?: () => Date;
  minVersion?: SecureVersion;
  maxVersion?: SecureVersion;
  /** Réservé aux tests. */
  dial?: Dial;
  /** Réservé aux tests : autorités de certification de confiance. */
  ca?: string[];
}

/** Versions demandées pour un appel. L’énumération active s’en sert. */
export interface TlsProbeCall {
  minVersion?: SecureVersion;
  maxVersion?: SecureVersion;
}

export type TlsProbe = (
  host: string,
  call?: TlsProbeCall,
) => Promise<TlsProbeResult>;

export const TLS_PORT = 443;
const DAY_MS = 86_400_000;

/** Crée une sonde TLS (port 443) dont les IP épinglées vivent aussi longtemps que l'instance. */
export function createTlsProbe(options: TlsProbeOptions = {}): TlsProbe {
  const resolve = options.resolve ?? systemResolve;
  const dial = options.dial ?? directDial;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const now = options.now ?? (() => new Date());
  const pins = new Map<string, string>();

  return async function probeTls(hostname, call) {
    const { host, literalIp } = normalizeHost(hostname);
    const signal = AbortSignal.timeout(timeoutMs);
    let ip: string;
    try {
      ip = await pinAddress(host, resolve, pins, signal);
    } catch (error) {
      if (signal.aborted && !isNetError(error))
        throw new NetError('TIMEOUT', 'Délai DNS dépassé', { cause: error });
      throw error;
    }
    const target = dial(ip, TLS_PORT);

    const socket = connect({
      host: target.host,
      port: target.port,
      ...(literalIp ? {} : { servername: host }),
      rejectUnauthorized: false,
      ...((call?.minVersion ?? options.minVersion)
        ? { minVersion: call?.minVersion ?? options.minVersion }
        : {}),
      ...((call?.maxVersion ?? options.maxVersion)
        ? { maxVersion: call?.maxVersion ?? options.maxVersion }
        : {}),
      ...(options.ca ? { ca: options.ca } : {}),
    });

    return new Promise<TlsProbeResult>((done, fail) => {
      const timer = setTimeout(() => {
        socket.destroy();
        fail(new NetError('TIMEOUT', `Délai de ${timeoutMs} ms dépassé`));
      }, timeoutMs);
      socket.once('secureConnect', () => {
        clearTimeout(timer);
        try {
          const peer = socket.getPeerCertificate(true);
          const authError = socket.authorizationError;
          done({
            host,
            ip,
            port: TLS_PORT,
            protocol: socket.getProtocol(),
            cipher: socket.getCipher()?.name ?? null,
            authorized: socket.authorized,
            authorizationError: authError
              ? String((authError as NodeJS.ErrnoException).code ?? authError)
              : null,
            hostnameMatches: checkServerIdentity(host, peer) === undefined,
            certificate: certificateInfo(peer, now()),
            chain: chainOf(peer),
          });
        } catch (error) {
          fail(
            new NetError('TLS_HANDSHAKE_FAILED', 'Certificat illisible', {
              cause: error,
            }),
          );
        } finally {
          socket.end();
        }
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        socket.destroy();
        fail(
          new NetError('TLS_HANDSHAKE_FAILED', 'Négociation TLS impossible', {
            cause: error,
          }),
        );
      });
    });
  };
}

function name(
  entity: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!entity) return '';
  return Object.entries(entity)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('+') : v}`)
    .join(', ');
}

function certificateInfo(
  cert: DetailedPeerCertificate,
  at: Date,
): TlsCertificateInfo {
  const from = new Date(cert.valid_from);
  const to = new Date(cert.valid_to);
  return {
    subject: name(cert.subject as unknown as Record<string, string>),
    issuer: name(cert.issuer as unknown as Record<string, string>),
    validFrom: from.toISOString(),
    validTo: to.toISOString(),
    daysRemaining: Math.floor((to.getTime() - at.getTime()) / DAY_MS),
    expired: at.getTime() > to.getTime(),
    notYetValid: at.getTime() < from.getTime(),
    san: (cert.subjectaltname ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    fingerprint256: cert.fingerprint256,
  };
}

function chainOf(leaf: DetailedPeerCertificate): TlsChainEntry[] {
  const chain: TlsChainEntry[] = [];
  const seen = new Set<string>();
  let cert: DetailedPeerCertificate | undefined = leaf;
  while (cert?.fingerprint256 && !seen.has(cert.fingerprint256)) {
    seen.add(cert.fingerprint256);
    const issuer: DetailedPeerCertificate | undefined = cert.issuerCertificate;
    const selfSigned = issuer?.fingerprint256 === cert.fingerprint256;
    chain.push({
      subject: name(cert.subject as unknown as Record<string, string>),
      issuer: name(cert.issuer as unknown as Record<string, string>),
      validTo: new Date(cert.valid_to).toISOString(),
      selfSigned,
    });
    cert = issuer;
  }
  return chain;
}
