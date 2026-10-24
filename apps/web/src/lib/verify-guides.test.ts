import { buildChallenge } from '@audigy/engine';
import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/index.js';
import { localChallenge } from './verify-challenge.js';
import { guidesFor } from './verify-guides.js';

describe('guides de vérification', () => {
  it('détaille Netlify, le registrar et GitHub Pages', () => {
    const dns = guidesFor('dns_txt').flatMap((guide) => [
      guide.title,
      ...guide.steps,
    ]);
    const file = guidesFor('file').flatMap((guide) => [
      guide.title,
      ...guide.steps,
    ]);
    const dnsText = dns.map((key) => fr[key]).join('\n');
    const fileText = file.map((key) => fr[key]).join('\n');
    expect(dnsText).toContain('TXT');
    expect(dnsText).toContain('Netlify');
    expect(fileText).toContain('.nojekyll');
    expect(fileText.toLowerCase()).not.toContain('well-known');
    expect(guidesFor('meta')).toHaveLength(1);
  });

  it('aligne le défi affiché sur le moteur', () => {
    const site = {
      host: 'www.Exemple.fr',
      scope: 'path' as const,
      pathPrefix: '/Projet-Site-Artiste',
    };
    const token = 'a'.repeat(43);
    expect(localChallenge(site, token)).toEqual({
      dnsName: buildChallenge(site, 'file', token).dnsName,
      dnsValue: buildChallenge(site, 'file', token).dnsValue,
      fileUrl: buildChallenge(site, 'file', token).fileUrl,
      pageUrl: buildChallenge(site, 'file', token).pageUrl,
      metaTag: buildChallenge(site, 'file', token).metaTag,
    });
    expect(localChallenge(site, token).fileUrl).toContain(
      '/Projet-Site-Artiste/audigy-verification.txt',
    );
    expect(localChallenge(site, token).fileUrl).not.toContain('.well-known');
  });
});
