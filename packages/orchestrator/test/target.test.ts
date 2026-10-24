import { describe, expect, it } from 'vitest';
import {
  auditIdSchema,
  createAuditInput,
  InvalidSiteUrl,
  normalizeSiteUrl,
  targetOf,
} from '../src/index.js';

describe('normalizeSiteUrl', () => {
  it('note une origine en https, sans chemin', () => {
    expect(normalizeSiteUrl('Angelique-Osteo.fr')).toEqual({
      url: 'https://angelique-osteo.fr',
      scope: 'origin',
      host: 'angelique-osteo.fr',
      pathPrefix: null,
      hosting: 'other',
      label: 'angelique-osteo.fr',
    });
    expect(normalizeSiteUrl('http://exemple.fr/index.html?x=1#a').url).toBe(
      'https://exemple.fr',
    );
  });

  it('garde un préfixe de chemin (GitHub Pages)', () => {
    expect(
      normalizeSiteUrl('https://solopaps.github.io/Projet-Site-Artiste'),
    ).toMatchObject({
      url: 'https://solopaps.github.io/Projet-Site-Artiste/',
      scope: 'path',
      pathPrefix: '/Projet-Site-Artiste/',
      hosting: 'github_pages',
    });
    expect(normalizeSiteUrl('mon-site.netlify.app').hosting).toBe('netlify');
  });

  it.each([
    '',
    'ftp://exemple.fr',
    'https://user:mdp@exemple.fr',
    'https://exemple.fr:8443',
    'https://192.168.1.10',
    'https://[::1]/',
    'https://localhost',
    'https://intranet',
    'https://site.test',
    'https://bon.audigy.test',
    `https://exemple.fr/${'a'.repeat(2100)}`,
  ])('refuse %s', (raw) => {
    expect(() => normalizeSiteUrl(raw)).toThrow(InvalidSiteUrl);
  });

  it('accepte le labo seulement sur demande', () => {
    expect(normalizeSiteUrl('bon.audigy.test', { allowLab: true }).url).toBe(
      'https://bon.audigy.test',
    );
    expect(() => normalizeSiteUrl('autre.test', { allowLab: true })).toThrow(
      InvalidSiteUrl,
    );
  });

  it('donne une cible moteur', () => {
    const target = targetOf({
      url: 'https://solopaps.github.io/Projet/',
      scope: 'path',
      hosting: 'github_pages',
    });
    expect(target.url.href).toBe('https://solopaps.github.io/Projet/');
    expect(target.scope).toBe('path');
    expect(
      targetOf({ url: 'https://a.fr', scope: 'origin', hosting: 'x' }),
    ).toMatchObject({ hosting: 'other', scope: 'origin' });
  });
});

describe('createAuditInput', () => {
  const id = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

  it('passif par défaut, une seule cible', () => {
    expect(createAuditInput.parse({ url: 'exemple.fr' })).toEqual({
      url: 'exemple.fr',
      mode: 'passive',
    });
    expect(createAuditInput.parse({ siteId: id, mode: 'active' })).toEqual({
      siteId: id,
      mode: 'active',
    });
  });

  it.each([
    {},
    { url: 'a.fr', siteId: id },
    { siteId: 'pas-un-uuid' },
    { url: 'a.fr', mode: 'agressif' },
    { url: 'a.fr', extra: true },
    { url: '' },
  ])('refuse %j', (body) => {
    expect(createAuditInput.safeParse(body).success).toBe(false);
  });

  it('valide un identifiant d’audit', () => {
    expect(auditIdSchema.safeParse(id).success).toBe(true);
    expect(auditIdSchema.safeParse('../x').success).toBe(false);
  });
});
