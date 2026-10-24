import { describe, expect, it } from 'vitest';
import { matchProperty } from '../src/index.js';

const owner = (siteUrl: string) => ({
  siteUrl,
  permissionLevel: 'siteOwner',
});

describe('correspondance Search Console', () => {
  it('retient sc-domain: du domaine et des sous-domaines', () => {
    const properties = [owner('sc-domain:exemple.fr')];
    expect(matchProperty('https://exemple.fr/', properties)).toBe(
      'sc-domain:exemple.fr',
    );
    expect(matchProperty('https://www.exemple.fr/a', properties)).toBe(
      'sc-domain:exemple.fr',
    );
    expect(matchProperty('http://blog.exemple.fr/', properties)).toBe(
      'sc-domain:exemple.fr',
    );
  });

  it('refuse un domaine voisin ou un suffixe trop court', () => {
    const properties = [
      owner('sc-domain:exemple.fr'),
      owner('sc-domain:fr'),
      owner('sc-domain:com'),
    ];
    expect(matchProperty('https://exemple.fr.evil/', properties)).toBeNull();
    expect(matchProperty('https://pasexemple.fr/', properties)).toBeNull();
    expect(matchProperty('https://exemple.com/', properties)).toBeNull();
  });

  it('préfère le préfixe d’URL le plus long, schéma compris', () => {
    const properties = [
      owner('sc-domain:exemple.fr'),
      owner('https://exemple.fr/'),
      owner('https://exemple.fr/blog/'),
      owner('http://exemple.fr/blog/'),
    ];
    expect(matchProperty('https://exemple.fr/blog/article', properties)).toBe(
      'https://exemple.fr/blog/',
    );
    expect(matchProperty('http://exemple.fr/blog/article', properties)).toBe(
      'http://exemple.fr/blog/',
    );
    expect(matchProperty('https://exemple.fr/blogger', properties)).toBe(
      'https://exemple.fr/',
    );
  });

  it('ignore une propriété non vérifiée et un préfixe d’un autre hôte', () => {
    expect(
      matchProperty('https://exemple.fr/', [
        {
          siteUrl: 'sc-domain:exemple.fr',
          permissionLevel: 'siteUnverifiedUser',
        },
        owner('https://autre.fr/'),
      ]),
    ).toBeNull();
  });

  it('préfère le domaine le plus précis', () => {
    expect(
      matchProperty('https://www.exemple.fr/', [
        owner('sc-domain:exemple.fr'),
        owner('sc-domain:www.exemple.fr'),
      ]),
    ).toBe('sc-domain:www.exemple.fr');
  });
});
