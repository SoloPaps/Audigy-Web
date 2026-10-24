import { describe, expect, it } from 'vitest';
import { verdictFichier } from '../src/browser.js';
import { sha256Hex } from '../src/hash.js';
import { canonicaliser } from '../src/jcs.js';
import { construireManifeste } from '../src/manifest.js';
import { type Resultats, resultatsCanoniques } from '../src/results.js';

const RESULTATS: Resultats = {
  cible: 'https://exemple.fr/',
  ip: '203.0.113.10',
  certificatEmpreinte: 'ab'.repeat(32),
  ua: 'AudigyBot/1.0',
  viewport: { largeur: 390, hauteur: 844 },
  versions: { moteur: '0.15.0', methode: '2026.1', lighthouse: '13.5.0' },
  findings: [],
};

describe('JCS et manifeste', () => {
  it('ordonne les clés', () => {
    expect(canonicaliser({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('produit la même empreinte quel que soit l’ordre des clés', () => {
    const gauche = resultatsCanoniques(RESULTATS);
    const droite = resultatsCanoniques({
      findings: [],
      versions: { lighthouse: '13.5.0', methode: '2026.1', moteur: '0.15.0' },
      viewport: { hauteur: 844, largeur: 390 },
      ua: RESULTATS.ua,
      certificatEmpreinte: RESULTATS.certificatEmpreinte,
      ip: RESULTATS.ip,
      cible: RESULTATS.cible,
    });
    expect(gauche).toBe(droite);
  });

  it('un octet modifié dans le PDF ou le JSON ne correspond pas', () => {
    const json = resultatsCanoniques(RESULTATS);
    const pdf = new TextEncoder().encode('%PDF-1.4\nrapport\n%%EOF\n');
    const construit = construireManifeste(json, [
      { fichier: 'rapport.pdf', contenu: pdf },
    ]);
    const jsonOctets = new TextEncoder().encode(json);
    expect(verdictFichier(sha256Hex(jsonOctets), construit.manifeste)).toBe(
      'correspond',
    );
    expect(verdictFichier(sha256Hex(pdf), construit.manifeste)).toBe(
      'correspond',
    );

    const pdfModifie = new Uint8Array(pdf);
    const premier = pdfModifie[0] ?? 0;
    pdfModifie[0] = premier ^ 0xff;
    expect(verdictFichier(sha256Hex(pdfModifie), construit.manifeste)).toBe(
      'ne correspond pas',
    );

    const jsonModifie = new Uint8Array(jsonOctets);
    const dernier = jsonModifie[jsonModifie.length - 1] ?? 0;
    jsonModifie[jsonModifie.length - 1] = dernier ^ 0x01;
    expect(verdictFichier(sha256Hex(jsonModifie), construit.manifeste)).toBe(
      'ne correspond pas',
    );
  });
});
