import { describe, expect, it, vi } from 'vitest';
import { createDohResolver } from '../src/index.js';

function jsonFetch(body: unknown, status = 200) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
}

describe('createDohResolver', () => {
  it('interroge le point DoH en JSON et décode les TXT', async () => {
    const fetch = jsonFetch({
      Status: 0,
      AD: true,
      Answer: [
        {
          name: '_audigy-challenge.exemple.fr.',
          type: 16,
          TTL: 300,
          data: '"audigy-site-" "verification=abc"',
        },
      ],
    });
    const doh = createDohResolver({ fetch });
    const answer = await doh.query('_audigy-challenge.exemple.fr', 'TXT');
    expect(answer).toEqual({
      status: 0,
      authenticated: true,
      records: [
        {
          name: '_audigy-challenge.exemple.fr',
          type: 'TXT',
          ttl: 300,
          data: 'audigy-site-verification=abc',
        },
      ],
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      'https://cloudflare-dns.com/dns-query?name=_audigy-challenge.exemple.fr&type=TXT',
    );
    expect(init?.headers).toEqual({ accept: 'application/dns-json' });
    expect(init?.redirect).toBe('error');
  });

  it('renvoie les adresses A et AAAA', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const type = new URL(String(url)).searchParams.get('type');
      const Answer =
        type === 'A'
          ? [
              { name: 'exemple.fr', type: 5, TTL: 60, data: 'cdn.exemple.fr.' },
              {
                name: 'cdn.exemple.fr',
                type: 1,
                TTL: 60,
                data: '93.184.216.34',
              },
            ]
          : [
              {
                name: 'cdn.exemple.fr',
                type: 28,
                TTL: 60,
                data: '2606:2800:220:1::1',
              },
            ];
      return new Response(JSON.stringify({ Status: 0, Answer }));
    });
    const doh = createDohResolver({ fetch });
    expect(await doh.addresses('exemple.fr')).toEqual([
      '93.184.216.34',
      '2606:2800:220:1::1',
    ]);
  });

  it('signale NXDOMAIN sans enregistrement', async () => {
    const doh = createDohResolver({ fetch: jsonFetch({ Status: 3 }) });
    expect(await doh.query('absent.exemple.fr', 'A')).toEqual({
      status: 3,
      authenticated: false,
      records: [],
    });
  });

  it.each(['exemple.fr/../x', 'a b.fr', '', `${'x'.repeat(64)}.fr`])(
    'refuse le nom %s',
    async (name) => {
      const fetch = jsonFetch({ Status: 0 });
      await expect(
        createDohResolver({ fetch }).query(name, 'A'),
      ).rejects.toMatchObject({ code: 'INVALID_URL' });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('refuse un point d’accès non https', () => {
    expect(() =>
      createDohResolver({ endpoint: 'http://dns.example/dns-query' }),
    ).toThrow();
  });

  it('échoue proprement sur HTTP 500 et JSON invalide', async () => {
    await expect(
      createDohResolver({ fetch: jsonFetch({}, 500) }).query('a.fr', 'A'),
    ).rejects.toMatchObject({
      code: 'DNS_FAILURE',
    });
    await expect(
      createDohResolver({ fetch: jsonFetch({ nope: 1 }) }).query('a.fr', 'A'),
    ).rejects.toMatchObject({
      code: 'DNS_FAILURE',
    });
  });
});
