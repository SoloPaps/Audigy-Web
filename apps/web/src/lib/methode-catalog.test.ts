import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseMethodeCatalog } from './methode-catalog.js';

const markdown = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../docs/METHODE.md'),
  'utf8',
);

describe('parseMethodeCatalog', () => {
  const catalog = parseMethodeCatalog(markdown);

  it('lit chaque ligne Identifiant / Réussi, sans inventer de test', () => {
    expect(catalog.size).toBe(66);
    expect(catalog.get('securite.hsts')?.pass).toContain('15768000');
    expect(catalog.get('securite.https')?.pass).toContain('chiffrée');
    expect(catalog.get('performance.lcp')?.pass).toContain('2,5 s');
    expect(catalog.get('invente.owasp')).toBeUndefined();
  });

  it('copie le critère RGESN déjà tabulé, et rien pour les autres tests', () => {
    expect(catalog.get('ecologie.rgesn_budget')?.criterion).toBe(
      '6.1 — Poids et nombre de requêtes, plafonds absolus.',
    );
    expect(catalog.get('ecologie.rgesn_polices')?.criterion).toContain('4.8');
    expect(catalog.get('securite.hsts')?.criterion).toBeNull();
  });

  it('cite la référence déjà écrite dans le chapitre, sinon rien', () => {
    expect(catalog.get('securite.hsts')?.citation).toBe('MDN HTTP Observatory');
    expect(catalog.get('securite.csp')?.citation).toBe('MDN HTTP Observatory');
    expect(catalog.get('performance.lighthouse')?.citation).toBe(
      'PageSpeed Insights',
    );
    expect(catalog.get('performance.lcp')?.citation).toBe('CrUX');
    expect(catalog.get('performance.poids')?.citation).toBe('Lighthouse');
    expect(catalog.get('seo.lighthouse')?.citation).toBe('Lighthouse');
    expect(catalog.get('accessibilite.lighthouse')?.citation).toBe('Lighthouse');
    expect(catalog.get('seo.title')?.citation).toBeNull();
    expect(catalog.get('dns_email.spf')?.citation).toBe('RFC 7208');
    expect(catalog.get('dns_email.mx')?.citation).toBe('RFC 7505');
    expect(catalog.get('dns_email.dkim')?.citation).toBeNull();
    expect(catalog.get('ecologie.ecoindex')?.citation).toBe(
      'https://www.ecoindex.fr/comment-ca-marche/',
    );
    expect(catalog.get('ecologie.co2')?.citation).toBe('Sustainable Web Design');
    expect(catalog.get('ecologie.hebergeur')?.citation).toBe(
      'thegreenwebfoundation.org',
    );
    expect(catalog.get('ecologie.rgesn_cache')?.citation).toBe(
      'référentiel général d’écoconception',
    );
    expect(catalog.get('qualite.html')?.citation).toBe('html-validate');
    expect(catalog.get('securite.cve_scripts')?.citation).toBe('https://osv.dev/');
    expect(catalog.get('securite.cve_logiciels')?.citation).toBe(
      'https://nvd.nist.gov/developers/vulnerabilities',
    );
    expect(catalog.get('securite.technologies')?.citation).toBeNull();
    expect(catalog.get('vie_privee.traceurs')?.citation).toBe('Tracker Radar');
    expect(catalog.get('vie_privee.cmp')?.citation).toBe('Tracker Radar');
    expect(catalog.get('vie_privee.mentions')?.citation).toBeNull();
    expect(catalog.get('securite.fichiers')?.citation).toBeNull();
    expect(catalog.get('securite.listing')?.citation).toBeNull();
    expect(catalog.get('securite.tls')?.citation).toBeNull();
    expect(catalog.get('reputation.avis')?.citation).toBeNull();
    for (const entry of catalog.values()) {
      expect(entry.citation ?? '').not.toMatch(/OWASP|NIST SP|NIST 800|CSF/);
    }
  });
});
