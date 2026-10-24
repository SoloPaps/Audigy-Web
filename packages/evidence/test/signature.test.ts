import { createPublicKey } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signatureCorrespond } from '../src/browser.js';
import { construireManifeste } from '../src/manifest.js';
import { manifesteCanonique } from '../src/manifest-canon.js';
import { type Resultats, resultatsCanoniques } from '../src/results.js';
import {
  documentClePublique,
  genererCleEd25519,
  signerManifeste,
  verifierManifeste,
} from '../src/sign.js';

const RESULTATS: Resultats = {
  cible: 'https://exemple.fr/',
  ip: '203.0.113.10',
  certificatEmpreinte: '',
  ua: 'AudigyBot/1.0',
  viewport: { largeur: 1280, hauteur: 720 },
  versions: { moteur: '0.15.0', methode: '2026.1', lighthouse: '13.5.0' },
  findings: [{ id: 'securite.https' }],
};

describe('signature Ed25519', () => {
  it('signe le manifeste et se vérifie dans WebCrypto', async () => {
    const { privee } = genererCleEd25519();
    const document = documentClePublique(privee);
    expect(document.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(document.jwk.crv).toBe('Ed25519');
    const manifeste = construireManifeste(resultatsCanoniques(RESULTATS), []);
    const signature = signerManifeste(manifeste.canonique, privee);
    expect(
      verifierManifeste(
        manifeste.canonique,
        signature,
        createPublicKey(privee),
      ),
    ).toBe(true);
    const autre = `${manifeste.canonique} `;
    expect(verifierManifeste(autre, signature, createPublicKey(privee))).toBe(
      false,
    );
    expect(manifesteCanonique(manifeste.manifeste)).toBe(manifeste.canonique);
    await expect(
      signatureCorrespond(
        manifeste.canonique,
        Buffer.from(signature).toString('base64'),
        document.jwk,
      ),
    ).resolves.toBe(true);
  });
});
