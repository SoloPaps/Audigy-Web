import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describe, expect, it } from 'vitest';
import { EvidenceError } from '../src/errors.js';
import { creerAutoriteLocale } from '../src/local-tsa.js';
import { construireManifeste } from '../src/manifest.js';
import { type Resultats, resultatsCanoniques } from '../src/results.js';
import {
  horodater,
  posterTsa,
  TSA_DEFAUT,
  type TsaPost,
  verifierJeton,
} from '../src/tsa.js';

const RESULTATS: Resultats = {
  cible: 'https://exemple.fr/',
  ip: '203.0.113.10',
  certificatEmpreinte: 'cd'.repeat(32),
  ua: 'AudigyBot/1.0',
  viewport: { largeur: 390, hauteur: 844 },
  versions: { moteur: '0.15.0', methode: '2026.1', lighthouse: '13.5.0' },
  findings: [],
};

const QUAND = new Date('2026-10-24T08:00:00.000Z');

describe('RFC 3161', () => {
  it('interroge deux TSA et vérifie empreinte, nonce et ancre', async () => {
    const a = await creerAutoriteLocale('Horodatage A');
    const b = await creerAutoriteLocale('Horodatage B');
    const cibles = [
      { id: 'a', nom: 'Horodatage A', url: 'https://tsa-a.test/tsr' },
      {
        id: 'b',
        nom: 'Horodatage B',
        url: 'https://tsa-b.test/tsr',
        policy: '1.2.3.4.1',
      },
    ];
    const appels: string[] = [];
    const post: TsaPost = async (envoi) => {
      appels.push(envoi.url);
      const asn1 = asn1js.fromBER(envoi.corps);
      const demande = new pkijs.TimeStampReq({ schema: asn1.result });
      expect(demande.certReq).toBe(true);
      expect(demande.nonce).toBeDefined();
      if (envoi.url === cibles[0]?.url) return a.repondre(envoi.corps, QUAND);
      if (envoi.url === cibles[1]?.url) return b.repondre(envoi.corps, QUAND);
      throw new Error('tsa inattendue');
    };
    const manifeste = new TextEncoder().encode(
      construireManifeste(resultatsCanoniques(RESULTATS), []).canonique,
    );
    const resultats = await horodater(manifeste, {
      tsas: cibles,
      post,
      ancres: new Map([
        ['a', a.ancreDer],
        ['b', b.ancreDer],
      ]),
    });
    expect(appels).toEqual([cibles[0]?.url, cibles[1]?.url]);
    expect(resultats.every((item) => item.ok)).toBe(true);
    const premier = resultats[0];
    const second = resultats[1];
    if (!premier?.ok || !second?.ok) throw new Error('jeton absent');
    expect(premier.emetteur).toBe('Horodatage A');
    expect(second.emetteur).toBe('Horodatage B');
    expect(premier.genTime.toISOString()).toBe(QUAND.toISOString());
    expect(new Set([premier.nonce, second.nonce]).size).toBe(2);
  });

  it('refuse un jeton dont l’empreinte ou le nonce ne correspond pas', async () => {
    const autorite = await creerAutoriteLocale('Horodatage A');
    const manifeste = new TextEncoder().encode('{"resultsSha256":"abc"}');
    const autre = new TextEncoder().encode('{"resultsSha256":"abd"}');
    const cibles = [
      { id: 'a', nom: 'Horodatage A', url: 'https://tsa-a.test/tsr' },
    ];
    const post: TsaPost = (envoi) => autorite.repondre(envoi.corps, QUAND);
    const [bon] = await horodater(manifeste, {
      tsas: cibles,
      post,
      ancres: new Map([['a', autorite.ancreDer]]),
    });
    if (!bon?.ok) throw new Error(bon?.message ?? 'échec');
    await expect(
      verifierJeton(bon.jeton, {
        manifeste: autre,
        ancreDer: autorite.ancreDer,
      }),
    ).rejects.toMatchObject({ code: 'EMPREINTE' });
    const nonceFaux = new Uint8Array(16);
    nonceFaux[0] = 1;
    await expect(
      verifierJeton(bon.jeton, {
        manifeste,
        nonce: nonceFaux,
        ancreDer: autorite.ancreDer,
      }),
    ).rejects.toMatchObject({ code: 'NONCE' });
    const modifie = new Uint8Array(bon.jeton);
    const dernier = modifie[modifie.length - 1] ?? 0;
    modifie[modifie.length - 1] = dernier ^ 0xff;
    await expect(
      verifierJeton(modifie, { manifeste, ancreDer: autorite.ancreDer }),
    ).rejects.toBeInstanceOf(EvidenceError);
  });

  it('garde le second jeton si la première TSA échoue', async () => {
    const b = await creerAutoriteLocale('Horodatage B');
    const cibles = [
      { id: 'a', nom: 'Horodatage A', url: 'https://tsa-a.test/tsr' },
      { id: 'b', nom: 'Horodatage B', url: 'https://tsa-b.test/tsr' },
    ];
    const post: TsaPost = async (envoi) => {
      if (envoi.url === cibles[0]?.url) throw new Error('indisponible');
      return b.repondre(envoi.corps, QUAND);
    };
    const manifeste = new TextEncoder().encode('manifeste');
    const resultats = await horodater(manifeste, { tsas: cibles, post });
    expect(resultats[0]?.ok).toBe(false);
    expect(resultats[1]?.ok).toBe(true);
  });

  it('n’appelle pas le réseau hors des deux TSA', async () => {
    expect(TSA_DEFAUT).toHaveLength(2);
    expect(new Set(TSA_DEFAUT.map((tsa) => new URL(tsa.url).host)).size).toBe(
      2,
    );
    let appele = false;
    await expect(
      posterTsa('https://exemple.test/tsr', new Uint8Array([1]), {
        allow: TSA_DEFAUT.map((tsa) => tsa.url),
        fetchImpl: async () => {
          appele = true;
          throw new Error('réseau');
        },
      }),
    ).rejects.toMatchObject({ code: 'TSA' });
    expect(appele).toBe(false);
  });

  it('poste le corps sans suivre une redirection', async () => {
    let recu: { url: string; redirect: string; type: string } | undefined;
    const corps = new Uint8Array([1, 2, 3]);
    const jeton = new Uint8Array([9]);
    const recuOctets = await posterTsa(TSA_DEFAUT[0].url, corps, {
      allow: [TSA_DEFAUT[0].url],
      fetchImpl: async (input, init) => {
        recu = {
          url: String(input),
          redirect: init?.redirect ?? 'follow',
          type: new Headers(init?.headers).get('content-type') ?? '',
        };
        return new Response(jeton, { status: 200 });
      },
    });
    expect(recuOctets).toEqual(jeton);
    expect(recu).toEqual({
      url: TSA_DEFAUT[0].url,
      redirect: 'error',
      type: 'application/timestamp-query',
    });
  });
});
