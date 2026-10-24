import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerAutoriteLocale } from '../src/local-tsa.js';
import { manifesteCanonique } from '../src/manifest-canon.js';
import type { Resultats } from '../src/results.js';
import { sceller } from '../src/seal.js';
import { genererCleEd25519 } from '../src/sign.js';
import type { TsaPost } from '../src/tsa.js';
import { EXEMPLE_DOSSIER_ID } from '../src/types.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(ici, '../fixtures');
const web = path.resolve(ici, '../../../apps/web/public');
const quand = new Date('2026-10-24T08:00:00.000Z');

const resultats: Resultats = {
  cible: 'https://exemple.fr/',
  ip: '203.0.113.10',
  certificatEmpreinte: 'ab'.repeat(32),
  ua: 'AudigyBot/1.0',
  viewport: { largeur: 390, hauteur: 844 },
  versions: { moteur: '0.15.0', methode: '2026.1', lighthouse: '13.5.0' },
  findings: [],
};

const pdf = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<<>>\n%%EOF\n',
);

const a = await creerAutoriteLocale('Horodatage A');
const b = await creerAutoriteLocale('Horodatage B');
const cibles = [
  { id: 'a', nom: 'Horodatage A', url: 'https://tsa-a.test/tsr' },
  { id: 'b', nom: 'Horodatage B', url: 'https://tsa-b.test/tsr' },
];
const post: TsaPost = (envoi) => {
  if (envoi.url === cibles[0]?.url) return a.repondre(envoi.corps, quand);
  if (envoi.url === cibles[1]?.url) return b.repondre(envoi.corps, quand);
  throw new Error('tsa inattendue');
};
const { privee } = genererCleEd25519();
const sceau = await sceller({
  id: EXEMPLE_DOSSIER_ID,
  date: quand,
  resultats,
  fichiers: [{ fichier: 'rapport.pdf', contenu: pdf }],
  clePrivee: privee,
  tsas: cibles,
  post,
  ancres: new Map([
    ['a', a.ancreDer],
    ['b', b.ancreDer],
  ]),
});
const premier = sceau.jetons[0];
const second = sceau.jetons[1];
if (!premier || !second || !sceau.clePublique) {
  throw new Error('sceau incomplet');
}

await mkdir(fixtures, { recursive: true });
await mkdir(path.join(web, 'preuves'), { recursive: true });
await mkdir(path.join(web, '.well-known'), { recursive: true });

const canonique = manifesteCanonique(sceau.dossier.manifeste);
await writeFile(path.join(fixtures, 'results.json'), sceau.resultats);
await writeFile(path.join(fixtures, 'rapport.pdf'), pdf);
await writeFile(path.join(fixtures, 'ancre-a.pem'), a.ancrePem);
await writeFile(path.join(fixtures, 'ancre-b.pem'), b.ancrePem);
await writeFile(path.join(fixtures, 'jeton-a.tsr'), premier.octets);
await writeFile(path.join(fixtures, 'jeton-b.tsr'), second.octets);
await writeFile(path.join(fixtures, 'manifeste.txt'), canonique);
await writeFile(
  path.join(fixtures, 'meta.json'),
  `${JSON.stringify(
    {
      empreinte: sceau.dossier.empreinte,
      date: quand.toISOString(),
      jetons: [
        {
          fichier: 'jeton-a.tsr',
          ancre: 'ancre-a.pem',
          nonce: premier.nonce,
          emetteur: 'Horodatage A',
          genTime: quand.toISOString(),
        },
        {
          fichier: 'jeton-b.tsr',
          ancre: 'ancre-b.pem',
          nonce: second.nonce,
          emetteur: 'Horodatage B',
          genTime: quand.toISOString(),
        },
      ],
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  path.join(web, 'preuves', `${EXEMPLE_DOSSIER_ID}.json`),
  `${JSON.stringify(sceau.dossier, null, 2)}\n`,
);
await writeFile(
  path.join(web, '.well-known', 'audigy-signing-key'),
  `${JSON.stringify(sceau.clePublique, null, 2)}\n`,
);

for (const [index, ancre] of ['ancre-a.pem', 'ancre-b.pem'].entries()) {
  const jeton = index === 0 ? 'jeton-a.tsr' : 'jeton-b.tsr';
  const sortie = execFileSync(
    'openssl',
    [
      'ts',
      '-verify',
      '-in',
      path.join(fixtures, jeton),
      '-digest',
      sceau.dossier.empreinte,
      '-CAfile',
      path.join(fixtures, ancre),
    ],
    { encoding: 'utf8' },
  );
  if (!sortie.includes('Verification: OK')) {
    throw new Error(`openssl a refusé ${jeton} : ${sortie}`);
  }
  console.log(jeton, sortie.trim());
}
