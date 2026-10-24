import { describe, expect, it } from 'vitest';
import { cookieIsThirdParty, isThirdParty, siteOf } from '../src/site.js';

describe('site (domaine enregistrable)', () => {
  it.each([
    ['www.angelique-osteo.fr', 'angelique-osteo.fr'],
    ['angelique-osteo.fr', 'angelique-osteo.fr'],
    ['solopaps.github.io', 'solopaps.github.io'],
    ['a.b.netlify.app', 'b.netlify.app'],
    ['www.bbc.co.uk', 'bbc.co.uk'],
    ['WWW.Exemple.FR.', 'exemple.fr'],
    ['93.184.216.34', '93.184.216.34'],
    ['[2001:db8::1]', '2001:db8::1'],
  ])('%s → %s', (host, site) => {
    expect(siteOf(host)).toBe(site);
  });

  it('sépare deux clients d’un même hébergeur', () => {
    expect(isThirdParty('autre.github.io', 'solopaps.github.io')).toBe(true);
    expect(isThirdParty('cdn.exemple.fr', 'www.exemple.fr')).toBe(false);
    expect(cookieIsThirdParty('.exemple.fr', 'www.exemple.fr')).toBe(false);
    expect(cookieIsThirdParty('.doubleclick.net', 'www.exemple.fr')).toBe(true);
  });
});
