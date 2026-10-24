import type { KeyObject } from 'node:crypto';
import { versBase64 } from './bytes.js';
import { construireManifeste, type FichierSource } from './manifest.js';
import { type Resultats, resultatsCanoniques } from './results.js';
import {
  type ClePubliqueEd25519,
  documentClePublique,
  signerManifeste,
} from './sign.js';
import type { TsaCible, TsaPost } from './tsa.js';
import { horodater } from './tsa.js';
import type { DossierPublic } from './types.js';

export interface JetonScelle {
  id: string;
  nom: string;
  octets: Uint8Array;
  nonce: string;
}

export interface Sceau {
  dossier: DossierPublic;
  /** `results.json` canonique, sans saut de ligne final. */
  resultats: string;
  clePublique: ClePubliqueEd25519 | null;
  jetons: JetonScelle[];
}

/**
 * Scelle un rapport : JCS, manifeste, empreinte, deux horodatages, signature.
 * La signature porte sur le manifeste canonique. Sans clé, `signature` est nulle.
 */
export async function sceller(options: {
  id: string;
  date: Date;
  resultats: Resultats;
  fichiers: readonly FichierSource[];
  clePrivee?: KeyObject | null;
  tsas?: readonly TsaCible[];
  post?: TsaPost;
  ancres?: ReadonlyMap<string, Uint8Array>;
}): Promise<Sceau> {
  const resultats = resultatsCanoniques(options.resultats);
  const construit = construireManifeste(resultats, options.fichiers);
  const manifesteOctets = new TextEncoder().encode(construit.canonique);
  const horodatages = await horodater(manifesteOctets, {
    ...(options.tsas ? { tsas: options.tsas } : {}),
    ...(options.post ? { post: options.post } : {}),
    ...(options.ancres ? { ancres: options.ancres } : {}),
  });
  const cle = options.clePrivee ?? null;
  const signature = cle ? signerManifeste(construit.canonique, cle) : null;
  const dossier: DossierPublic = {
    id: options.id,
    date: options.date.toISOString(),
    empreinte: construit.empreinte,
    manifeste: construit.manifeste,
    horodatages: horodatages.flatMap((item) =>
      item.ok
        ? [
            {
              service: item.tsa.nom,
              emetteur: item.emetteur,
              genTime: item.genTime.toISOString(),
              jetonBase64: versBase64(item.jeton),
              chainePem: item.chainePem,
            },
          ]
        : [],
    ),
    signature: signature ? versBase64(signature) : null,
  };
  return {
    dossier,
    resultats,
    clePublique: cle ? documentClePublique(cle) : null,
    jetons: horodatages.flatMap((item) =>
      item.ok
        ? [
            {
              id: item.tsa.id,
              nom: item.tsa.nom,
              octets: item.jeton,
              nonce: item.nonce,
            },
          ]
        : [],
    ),
  };
}
