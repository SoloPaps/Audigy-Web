import type { AddressInfo } from 'node:net';
import { createServer, type SecureVersion, type Server } from 'node:tls';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createTlsProbe,
  type Resolve,
  type TlsProbeOptions,
} from '../src/index.js';
import { generateTestCerts, type TestCerts } from './certs.js';

const PUBLIC_IP = '93.184.216.34';
const DAY = 86_400_000;
let certs: TestCerts;
const servers: Server[] = [];

beforeAll(() => {
  certs = generateTestCerts();
});

afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
});

async function startServer(options: {
  key: string;
  cert: string;
  minVersion?: SecureVersion;
  maxVersion?: SecureVersion;
}): Promise<number> {
  const server = createServer(options, (socket) => socket.end());
  server.on('tlsClientError', () => {});
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return (server.address() as AddressInfo).port;
}

function probeFor(port: number, options: Partial<TlsProbeOptions> = {}) {
  const resolve = vi.fn<Resolve>(async () => [PUBLIC_IP]);
  const dialed: Array<[string, number]> = [];
  const probe = createTlsProbe({
    resolve,
    dial: (ip, p) => {
      dialed.push([ip, p]);
      return { host: '127.0.0.1', port };
    },
    ...options,
  });
  return { probe, resolve, dialed };
}

describe('probeTls', () => {
  it('chaîne complète et de confiance, SAN conforme', async () => {
    const port = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert + certs.caCert,
    });
    const { probe, dialed } = probeFor(port, { ca: [certs.caCert] });
    const result = await probe('audigy.test');
    expect(dialed).toEqual([[PUBLIC_IP, 443]]);
    expect(result.ip).toBe(PUBLIC_IP);
    expect(result.authorized).toBe(true);
    expect(result.authorizationError).toBeNull();
    expect(result.hostnameMatches).toBe(true);
    expect(result.certificate.san).toEqual([
      'DNS:audigy.test',
      'DNS:www.audigy.test',
    ]);
    expect(result.chain.map((c) => c.subject)).toEqual([
      'CN=audigy.test',
      'CN=Audigy Test CA',
    ]);
    expect(result.chain[1]?.selfSigned).toBe(true);
    expect(result.certificate.expired).toBe(false);
    expect(result.certificate.daysRemaining).toBeGreaterThanOrEqual(28);
  });

  it('chaîne incomplète (intermédiaire absent)', async () => {
    const port = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert,
    });
    const result = await probeFor(port).probe('audigy.test');
    expect(result.authorized).toBe(false);
    expect(result.authorizationError).toBe('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]?.selfSigned).toBe(false);
  });

  it('certificat autosigné', async () => {
    const port = await startServer({
      key: certs.selfKey,
      cert: certs.selfCert,
    });
    const result = await probeFor(port).probe('audigy.test');
    expect(result.authorized).toBe(false);
    expect(result.authorizationError).toBe('DEPTH_ZERO_SELF_SIGNED_CERT');
    expect(result.chain[0]?.selfSigned).toBe(true);
  });

  it('SAN ne couvrant pas le nom demandé', async () => {
    const port = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert + certs.caCert,
    });
    const result = await probeFor(port, { ca: [certs.caCert] }).probe(
      'autre.test',
    );
    expect(result.hostnameMatches).toBe(false);
    expect(result.host).toBe('autre.test');
  });

  it('expiration évaluée à la date fournie', async () => {
    const port = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert + certs.caCert,
    });
    const later = new Date(Date.now() + 60 * DAY);
    const result = await probeFor(port, { now: () => later }).probe(
      'audigy.test',
    );
    expect(result.certificate.expired).toBe(true);
    expect(result.certificate.daysRemaining).toBeLessThan(0);
    const earlier = new Date(Date.now() - 2 * DAY);
    const before = await probeFor(port, { now: () => earlier }).probe(
      'audigy.test',
    );
    expect(before.certificate.notYetValid).toBe(true);
  });

  it('protocole négocié', async () => {
    const tls12 = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert,
      maxVersion: 'TLSv1.2',
    });
    expect((await probeFor(tls12).probe('audigy.test')).protocol).toBe(
      'TLSv1.2',
    );
    const tls13 = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert,
      minVersion: 'TLSv1.3',
    });
    const result = await probeFor(tls13).probe('audigy.test');
    expect(result.protocol).toBe('TLSv1.3');
    expect(result.cipher).toMatch(/^TLS_/);
  });

  it('échec de négociation si le protocole est refusé', async () => {
    const port = await startServer({
      key: certs.leafKey,
      cert: certs.leafCert,
      minVersion: 'TLSv1.3',
    });
    await expect(
      probeFor(port, { maxVersion: 'TLSv1.2' }).probe('audigy.test'),
    ).rejects.toMatchObject({
      code: 'TLS_HANDSHAKE_FAILED',
    });
  });

  it.each(['127.0.0.1', '169.254.169.254', '[::1]', '0x7f.1', 'localhost'])(
    'refuse la cible %s',
    async (host) => {
      const { probe, dialed } = probeFor(1);
      await expect(probe(host)).rejects.toMatchObject({
        code: 'BLOCKED_ADDRESS',
      });
      expect(dialed).toEqual([]);
    },
  );

  it('refuse un nom résolu en IP privée', async () => {
    const probe = createTlsProbe({ resolve: async () => ['192.168.0.10'] });
    await expect(probe('interne.test')).rejects.toMatchObject({
      code: 'BLOCKED_ADDRESS',
    });
  });

  it('délai dépassé', async () => {
    const probe = createTlsProbe({
      timeoutMs: 100,
      resolve: () => new Promise(() => {}),
    });
    await expect(probe('lent.test')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
