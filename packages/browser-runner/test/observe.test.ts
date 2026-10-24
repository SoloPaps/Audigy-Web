import { describe, expect, it } from 'vitest';
import {
  collectConsole,
  collectMixedContent,
  normalizeCookies,
  parseMixedContent,
  type RawAxeResults,
  type RawCookie,
  summarizeAxe,
} from '../src/observe.js';
import type { RequestRecord } from '../src/schema.js';

const PAGE = 'https://www.exemple.fr/';

describe('contenu mixte', () => {
  it('lit les trois messages de Chromium', () => {
    expect(
      parseMixedContent(
        `Mixed Content: The page at '${PAGE}' was loaded over HTTPS, but requested an insecure script 'http://cdn.exemple.fr/a.js'. This request has been blocked; the content must be served over HTTPS.`,
      ),
    ).toEqual({
      url: 'http://cdn.exemple.fr/a.js',
      kind: 'blocked',
      resourceType: 'script',
    });
    expect(
      parseMixedContent(
        `Mixed Content: The page at '${PAGE}' was loaded over HTTPS, but requested an insecure element 'http://cdn.exemple.fr/i.png'. This request was automatically upgraded to HTTPS, For more information see https://blog.chromium.org/`,
      )?.kind,
    ).toBe('upgraded');
    expect(
      parseMixedContent(
        `Mixed Content: The page at '${PAGE}' was loaded over HTTPS, but requested an insecure element 'http://1.2.3.4/i.png'. This content should also be served over HTTPS.`,
      )?.kind,
    ).toBe('loaded');
    expect(parseMixedContent('Uncaught TypeError: x')).toBeNull();
  });

  it('ajoute les requêtes parties en clair, sans les redirections ni une page non chiffrée', () => {
    const base: RequestRecord = {
      url: 'http://cdn.exemple.fr/video.mp4',
      method: 'GET',
      resourceType: 'media',
      host: 'cdn.exemple.fr',
      thirdParty: false,
      outcome: 'network',
      status: 200,
      mimeType: 'video/mp4',
      transferBytes: 10,
      reason: null,
    };
    const redirect = { ...base, url: 'http://www.exemple.fr/', status: 302 };
    expect(collectMixedContent(PAGE, [], [base, redirect])).toEqual([
      { url: base.url, kind: 'loaded', resourceType: 'media' },
    ]);
    expect(collectMixedContent('http://www.exemple.fr/', [], [base])).toEqual(
      [],
    );
  });
});

describe('console', () => {
  it('sépare les erreurs du site de celles provoquées par le runner', () => {
    const entries = collectConsole(
      [
        { source: 'console', text: 'Erreur du site', url: `${PAGE}app.js` },
        {
          source: 'console',
          text: 'Failed to load resource: net::ERR_FAILED',
          url: 'http://10.0.0.1/x.png',
        },
        {
          source: 'console',
          text: `Mixed Content: The page at '${PAGE}' …`,
          url: PAGE,
        },
        { source: 'pageerror', text: 'TypeError: a is undefined', url: null },
      ],
      new Set(['http://10.0.0.1/x.png']),
    );
    expect(entries.map((e) => [e.text, e.runnerCaused])).toEqual([
      ['Erreur du site', false],
      ['Failed to load resource: net::ERR_FAILED', true],
      ['TypeError: a is undefined', false],
    ]);
  });

  it('borne le nombre et la longueur', () => {
    const many = Array.from({ length: 150 }, () => ({
      source: 'console' as const,
      text: 'x'.repeat(900),
      url: null,
    }));
    const entries = collectConsole(many, new Set());
    expect(entries).toHaveLength(100);
    expect(entries[0]?.text).toHaveLength(500);
  });
});

describe('traces', () => {
  const now = new Date('2026-10-24T00:00:00Z');
  const cookie = (over: Partial<RawCookie>): RawCookie => ({
    name: 'x',
    value: 'secret-value',
    domain: 'www.exemple.fr',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
    ...over,
  });

  it('ne garde jamais la valeur, classe origine et durée', () => {
    const records = normalizeCookies(
      [
        cookie({ name: 'session' }),
        cookie({
          name: '_ga',
          domain: '.exemple.fr',
          expires: now.getTime() / 1000 + 86_400 * 395,
        }),
        cookie({ name: 'IDE', domain: '.doubleclick.net', sameSite: 'None' }),
      ],
      'www.exemple.fr',
      new Map([['www.exemple.fr', new Set(['session'])]]),
      now,
    );
    expect(JSON.stringify(records)).not.toContain('secret-value');
    expect(records.map((r) => [r.name, r.thirdParty, r.setBy])).toEqual([
      ['IDE', true, 'script'],
      ['_ga', false, 'script'],
      ['session', false, 'header'],
    ]);
    const ga = records.find((r) => r.name === '_ga');
    expect(ga?.lifetimeDays).toBe(395);
    expect(ga?.expires).toBe('2027-11-23T00:00:00.000Z');
    expect(records.find((r) => r.name === 'session')).toMatchObject({
      expires: null,
      lifetimeDays: null,
      valueLength: 12,
    });
  });

  it("n'attribue un en-tête qu'au domaine qui l'a posé", () => {
    const [record] = normalizeCookies(
      [cookie({ name: 'uid', domain: 'traceur.net' })],
      'www.exemple.fr',
      new Map([['www.exemple.fr', new Set(['uid'])]]),
      now,
    );
    expect(record?.setBy).toBe('script');
  });
});

describe('axe', () => {
  it('résume, trie et borne les résultats', () => {
    const results: RawAxeResults = {
      testEngine: { version: '4.14.0' },
      url: PAGE,
      violations: [
        {
          id: 'label',
          impact: 'critical',
          tags: ['wcag2a'],
          help: 'Les champs ont une étiquette',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.14/label',
          nodes: Array.from({ length: 25 }, (_, i) => ({
            target: [['iframe', `#champ-${i}`]],
            html: `<input id="champ-${i}">${'x'.repeat(400)}`,
          })),
        },
        {
          id: 'image-alt',
          impact: 'bizarre',
          tags: [],
          help: 'Images',
          helpUrl: '',
          nodes: [{ target: ['img'], html: '<img>' }],
        },
      ],
      incomplete: [],
      passes: [{ id: 'document-title' }, { id: 'bypass' }],
      inapplicable: [{ id: 'video-caption' }],
    };
    const summary = summarizeAxe(results);
    expect(summary.violations.map((v) => v.id)).toEqual(['image-alt', 'label']);
    expect(summary.violations[0]?.impact).toBeNull();
    const label = summary.violations[1];
    expect(label?.nodeCount).toBe(25);
    expect(label?.nodes).toHaveLength(20);
    expect(label?.nodes[0]?.target).toEqual(['iframe >>> #champ-0']);
    expect(label?.nodes[0]?.html).toHaveLength(300);
    expect(summary.passes).toEqual(['bypass', 'document-title']);
  });
});
