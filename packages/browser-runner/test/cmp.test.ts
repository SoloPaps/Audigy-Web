import { describe, expect, it } from 'vitest';
import {
  CMP_SIGNATURES,
  detectCmp,
  PROBE_GLOBALS,
  PROBE_SELECTORS,
} from '../src/cmp.js';

const none = { globals: [], selectors: [] };

describe('détection des plateformes de consentement', () => {
  it.each([
    ['tarteaucitron', 'https://www.exemple.fr/tarteaucitron/tarteaucitron.js'],
    ['axeptio', 'https://static.axept.io/sdk.js'],
    ['didomi', 'https://sdk.privacy-center.org/abc/loader.js?target=x'],
    ['cookiebot', 'https://consent.cookiebot.com/uc.js'],
    ['onetrust', 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js'],
    ['sirdata', 'https://cache.consentframework.com/js/pa/1/c/2/stub'],
    ['usercentrics', 'https://app.usercentrics.eu/browser-ui/latest/loader.js'],
  ])('reconnaît %s par son script', (id, url) => {
    const found = detectCmp([url], none);
    expect(found.map((m) => m.id)).toEqual([id]);
    expect(found[0]?.evidence).toEqual([`script:${url}`]);
  });

  it.each([
    ['tarteaucitron', 'tarteaucitron', '#tarteaucitronRoot'],
    ['axeptio', 'axeptioSettings', '#axeptio_overlay'],
    ['didomi', 'Didomi', '#didomi-host'],
    ['cookiebot', 'Cookiebot', '#CybotCookiebotDialog'],
    ['onetrust', 'OneTrust', '#onetrust-banner-sdk'],
  ])('reconnaît %s par la page (script auto-hébergé)', (id, global, dom) => {
    const found = detectCmp(['https://www.exemple.fr/js/bundle.js'], {
      globals: [global],
      selectors: [dom],
    });
    expect(found).toEqual([
      expect.objectContaining({
        id,
        evidence: [`global:${global}`, `dom:${dom}`],
      }),
    ]);
  });

  it('ne voit rien sur une page sans bandeau', () => {
    expect(
      detectCmp(
        [
          'https://www.exemple.fr/app.js',
          'https://www.googletagmanager.com/gtag/js?id=G-1',
        ],
        none,
      ),
    ).toEqual([]);
  });

  it('rapporte plusieurs plateformes et dédoublonne les preuves', () => {
    const url = 'https://consent.cookiebot.com/uc.js';
    const found = detectCmp([url, url], {
      globals: ['Didomi'],
      selectors: [],
    });
    expect(found.map((m) => m.id)).toEqual(['didomi', 'cookiebot']);
    expect(found[1]?.evidence).toEqual([`script:${url}`]);
  });

  it('sonde chaque variable et sélecteur une seule fois', () => {
    expect(new Set(PROBE_GLOBALS).size).toBe(PROBE_GLOBALS.length);
    expect(new Set(PROBE_SELECTORS).size).toBe(PROBE_SELECTORS.length);
    const ids = CMP_SIGNATURES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'tarteaucitron',
        'axeptio',
        'didomi',
        'cookiebot',
        'onetrust',
      ]),
    );
  });
});
