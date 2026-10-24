import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lireDossier, verdictFichier } from '../src/browser.js';
import { depuisHex } from '../src/bytes.js';
import { EvidenceError } from '../src/errors.js';
import { sha256Hex } from '../src/hash.js';
import { pemVersDer } from '../src/local-tsa.js';
import { verifierJeton } from '../src/tsa.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(ici, '../fixtures');
const dossierPublic = path.resolve(
  ici,
  '../../../apps/web/public/preuves/00000000-0000-4000-8000-000000000019.json',
);
const clePublique = path.resolve(
  ici,
  '../../../apps/web/public/.well-known/audigy-signing-key',
);

interface JetonMeta {
  fichier: string;
  ancre: string;
  nonce: string;
  emetteur: string;
  genTime: string;
}

interface Meta {
  empreinte: string;
  date: string;
  jetons: JetonMeta[];
}

async function lire(nom: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path.join(fixtures, nom)));
}

describe('jetons de fixture', () => {
  it('vérifie les deux jetons hors ligne, y compris avec openssl', async () => {
    const meta = JSON.parse(
      await readFile(path.join(fixtures, 'meta.json'), 'utf8'),
    ) as Meta;
    const manifeste = await lire('manifeste.txt');
    expect(sha256Hex(manifeste)).toBe(meta.empreinte);
    expect(meta.jetons).toHaveLength(2);
    const dossier = lireDossier(
      JSON.parse(await readFile(dossierPublic, 'utf8')),
    );
    expect(dossier?.empreinte).toBe(meta.empreinte);
    expect(
      verdictFichier(
        sha256Hex(await lire('results.json')),
        dossier?.manifeste ?? { fichiers: [], resultsSha256: '' },
      ),
    ).toBe('correspond');
    expect(
      verdictFichier(
        sha256Hex(await lire('rapport.pdf')),
        dossier?.manifeste ?? { fichiers: [], resultsSha256: '' },
      ),
    ).toBe('correspond');
    const cle = JSON.parse(await readFile(clePublique, 'utf8')) as {
      jwk?: { d?: string };
    };
    expect(cle.jwk?.d).toBeUndefined();

    for (const jeton of meta.jetons) {
      const octets = await lire(jeton.fichier);
      const ancre = pemVersDer(
        await readFile(path.join(fixtures, jeton.ancre), 'utf8'),
      );
      const verifie = await verifierJeton(octets, {
        manifeste,
        nonce: depuisHex(jeton.nonce),
        ancreDer: ancre,
      });
      expect(verifie.emetteur).toBe(jeton.emetteur);
      expect(verifie.genTime.toISOString()).toBe(jeton.genTime);
      expect(verifie.empreinte).toBe(meta.empreinte);
      const sortie = execFileSync(
        'openssl',
        [
          'ts',
          '-verify',
          '-in',
          path.join(fixtures, jeton.fichier),
          '-digest',
          meta.empreinte,
          '-CAfile',
          path.join(fixtures, jeton.ancre),
        ],
        { encoding: 'utf8' },
      );
      expect(sortie).toContain('Verification: OK');
    }
  });

  it('refuse un manifeste, un nonce ou un jeton modifié', async () => {
    const meta = JSON.parse(
      await readFile(path.join(fixtures, 'meta.json'), 'utf8'),
    ) as Meta;
    const premier = meta.jetons[0];
    if (!premier) throw new Error('jeton absent');
    const manifeste = await lire('manifeste.txt');
    const octets = await lire(premier.fichier);
    const ancreDer = pemVersDer(
      await readFile(path.join(fixtures, premier.ancre), 'utf8'),
    );
    const autre = new Uint8Array(manifeste);
    const dernier = autre[autre.length - 1] ?? 0;
    autre[autre.length - 1] = dernier ^ 0x01;
    await expect(
      verifierJeton(octets, {
        manifeste: autre,
        nonce: depuisHex(premier.nonce),
        ancreDer,
      }),
    ).rejects.toMatchObject({ code: 'EMPREINTE' });

    const nonce = depuisHex(premier.nonce);
    const nonceAutre = new Uint8Array(nonce);
    const fin = nonceAutre[nonceAutre.length - 1] ?? 0;
    nonceAutre[nonceAutre.length - 1] = fin ^ 0x01;
    await expect(
      verifierJeton(octets, { manifeste, nonce: nonceAutre, ancreDer }),
    ).rejects.toMatchObject({ code: 'NONCE' });

    const casse = new Uint8Array(octets);
    const bout = casse[casse.length - 1] ?? 0;
    casse[casse.length - 1] = bout ^ 0xff;
    await expect(
      verifierJeton(casse, { manifeste, nonce, ancreDer }),
    ).rejects.toBeInstanceOf(EvidenceError);
  });
});
