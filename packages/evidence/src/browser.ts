import { manifesteCanonique } from './manifest-canon.js';
import {
  type DossierPublic,
  EXEMPLE_DOSSIER_ID,
  type Manifeste,
} from './types.js';

export type {
  DossierPublic,
  FichierManifeste,
  HorodatagePublic,
  Manifeste,
} from './types.js';
export { EXEMPLE_DOSSIER_ID, manifesteCanonique };

const HEX64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VerdictFichier = 'correspond' | 'ne correspond pas';

/**
 * Compare l’empreinte calculée dans le navigateur au manifeste.
 * Un seul octet modifié donne « ne correspond pas ».
 */
export function verdictFichier(
  empreinte: string,
  manifeste: Manifeste,
): VerdictFichier {
  const hash = empreinte.toLowerCase();
  if (!HEX64.test(hash)) return 'ne correspond pas';
  if (hash === manifeste.resultsSha256) return 'correspond';
  if (manifeste.fichiers.some((fichier) => fichier.sha256 === hash)) {
    return 'correspond';
  }
  return 'ne correspond pas';
}

/** Relit un dossier servi en statique. `null` si la forme est inutilisable. */
export function lireDossier(valeur: unknown): DossierPublic | null {
  if (!estObjet(valeur)) return null;
  if (typeof valeur.id !== 'string' || !UUID.test(valeur.id)) return null;
  if (
    typeof valeur.date !== 'string' ||
    Number.isNaN(Date.parse(valeur.date))
  ) {
    return null;
  }
  if (typeof valeur.empreinte !== 'string' || !HEX64.test(valeur.empreinte)) {
    return null;
  }
  if (!estObjet(valeur.manifeste)) return null;
  if (
    typeof valeur.manifeste.resultsSha256 !== 'string' ||
    !HEX64.test(valeur.manifeste.resultsSha256)
  ) {
    return null;
  }
  if (!Array.isArray(valeur.manifeste.fichiers)) return null;
  const fichiers = [];
  for (const fichier of valeur.manifeste.fichiers) {
    if (!estObjet(fichier)) return null;
    if (typeof fichier.fichier !== 'string' || fichier.fichier.length === 0) {
      return null;
    }
    if (typeof fichier.sha256 !== 'string' || !HEX64.test(fichier.sha256)) {
      return null;
    }
    if (
      typeof fichier.octets !== 'number' ||
      !Number.isInteger(fichier.octets)
    ) {
      return null;
    }
    if (fichier.octets < 0) return null;
    fichiers.push({
      fichier: fichier.fichier,
      sha256: fichier.sha256,
      octets: fichier.octets,
    });
  }
  if (!Array.isArray(valeur.horodatages)) return null;
  const horodatages = [];
  for (const item of valeur.horodatages) {
    if (!estObjet(item)) return null;
    if (typeof item.service !== 'string' || typeof item.emetteur !== 'string') {
      return null;
    }
    if (
      typeof item.genTime !== 'string' ||
      Number.isNaN(Date.parse(item.genTime))
    ) {
      return null;
    }
    if (
      typeof item.jetonBase64 !== 'string' ||
      typeof item.chainePem !== 'string'
    ) {
      return null;
    }
    horodatages.push({
      service: item.service,
      emetteur: item.emetteur,
      genTime: item.genTime,
      jetonBase64: item.jetonBase64,
      chainePem: item.chainePem,
    });
  }
  if (valeur.signature !== null && typeof valeur.signature !== 'string') {
    return null;
  }
  return {
    id: valeur.id,
    date: valeur.date,
    empreinte: valeur.empreinte,
    manifeste: { fichiers, resultsSha256: valeur.manifeste.resultsSha256 },
    horodatages,
    signature: valeur.signature,
  };
}

export async function signatureCorrespond(
  canonique: string,
  signatureBase64: string,
  jwk: { readonly kty?: string; readonly crv?: string; readonly x?: string },
): Promise<boolean> {
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') {
    return false;
  }
  try {
    const cle = await crypto.subtle.importKey(
      'jwk',
      { kty: 'OKP', crv: 'Ed25519', x: jwk.x },
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const signature = depuisBase64Souple(signatureBase64);
    if (!signature) return false;
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      cle,
      signature,
      new TextEncoder().encode(canonique),
    );
  } catch {
    return false;
  }
}

function depuisBase64Souple(valeur: string): Uint8Array | null {
  try {
    const binaire = atob(valeur);
    const out = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) {
      out[i] = binaire.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return (
    typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
  );
}
