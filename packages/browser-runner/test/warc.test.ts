import { ReadableStream } from 'node:stream/web';
import { ARTIFACT_LIMITS, ArtifactTooLargeError } from '@audigy/evidence';
import { describe, expect, it } from 'vitest';
import { WARCParser } from 'warcio';
import { buildHomepageWarc, warcDate } from '../src/warc.js';

const home = new TextEncoder().encode(
  '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><h1>Bonjour archive</h1></body></html>',
);
const css = new TextEncoder().encode('h1{color:#1b1f24}');

function exchange(
  url: string,
  body: Uint8Array,
  headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
  },
) {
  return { url, status: 200, headers: new Headers(headers), body };
}

async function records(bytes: Uint8Array) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const found: {
    type: string | undefined;
    url: string | null | undefined;
    text: string;
    date: string | null | undefined;
  }[] = [];
  for await (const record of new WARCParser(stream)) {
    const text =
      record.warcType === 'response' ? await record.contentText() : '';
    found.push({
      type: record.warcType,
      url: record.warcTargetURI,
      text,
      date: record.warcHeader('WARC-Date'),
    });
  }
  return found;
}

describe('WARC de la page d’accueil', () => {
  it('écrit une archive rejouable, sans valeur de trace', async () => {
    const bytes = await buildHomepageWarc({
      homepageUrl: 'https://exemple.test/',
      date: new Date('2026-10-24T08:00:00.000Z'),
      exchanges: [
        exchange('https://exemple.test/', home, {
          'content-type': 'text/html; charset=utf-8',
          'set-cookie': 'session=secret',
        }),
        exchange('https://exemple.test/style.css', css, {
          'content-type': 'text/css',
        }),
        exchange(
          'https://traceur.example/pixel.js',
          new Uint8Array([1, 2, 3]),
          {
            'content-type': 'text/javascript',
          },
        ),
      ],
    });
    expect(bytes.byteLength).toBeLessThanOrEqual(ARTIFACT_LIMITS.warcBytes);
    expect(Buffer.from(bytes).toString('latin1')).not.toContain('secret');
    const parsed = await records(bytes);
    expect(parsed.map((record) => record.type)).toEqual(
      expect.arrayContaining(['warcinfo', 'response']),
    );
    const page = parsed.find(
      (record) =>
        record.type === 'response' && record.url === 'https://exemple.test/',
    );
    expect(page?.date).toBe('2026-10-24T08:00:00Z');
    expect(page?.text).toContain('Bonjour archive');
    expect(
      parsed.find((record) => record.url === 'https://exemple.test/style.css')
        ?.text,
    ).toContain('color');
    expect(
      parsed.some((record) => record.url?.includes('traceur.example')),
    ).toBe(false);
  });

  it('retire la ressource trop lourde et garde la page', async () => {
    const bytes = await buildHomepageWarc({
      homepageUrl: 'https://exemple.test/',
      date: new Date('2026-10-24T08:00:00.000Z'),
      exchanges: [
        exchange('https://exemple.test/', home),
        exchange(
          'https://exemple.test/lourd.bin',
          new Uint8Array(ARTIFACT_LIMITS.warcBytes),
          { 'content-type': 'application/octet-stream' },
        ),
      ],
    });
    expect(bytes.byteLength).toBeLessThanOrEqual(ARTIFACT_LIMITS.warcBytes);
    const parsed = await records(bytes);
    expect(
      parsed.some((record) => record.url === 'https://exemple.test/'),
    ).toBe(true);
    expect(parsed.some((record) => record.url?.endsWith('/lourd.bin'))).toBe(
      false,
    );
  });

  it('refuse une page d’accueil au-dessus du plafond', async () => {
    await expect(
      buildHomepageWarc({
        homepageUrl: 'https://exemple.test/',
        date: new Date('2026-10-24T08:00:00.000Z'),
        exchanges: [
          exchange(
            'https://exemple.test/',
            new Uint8Array(ARTIFACT_LIMITS.warcBytes + 1),
          ),
        ],
      }),
    ).rejects.toBeInstanceOf(ArtifactTooLargeError);
  });

  it('date WARC sans millisecondes', () => {
    expect(warcDate(new Date('2026-10-24T08:00:00.123Z'))).toBe(
      '2026-10-24T08:00:00Z',
    );
  });
});
