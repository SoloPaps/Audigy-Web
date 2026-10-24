import { sha256Hex } from './hash.js';
import { canonicaliser } from './jcs.js';
import { manifesteCanonique } from './manifest-canon.js';
import type { FichierManifeste, Manifeste } from './types.js';

const NOM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Fichier listé dans le manifeste (PLAN §12.3). */
export interface ManifestFile {
  fichier: string;
  sha256: string;
  octets: number;
}

/**
 * Liste des artefacts et empreinte de `results.json`.
 * Le SHA-256 du manifeste canonique (JCS) est l’empreinte du rapport.
 * Le manifeste ne se contient pas : son empreinte se calcule après coup.
 */
export interface EvidenceManifest {
  fichiers: ManifestFile[];
  resultsSha256: string;
}

export function manifestFile(fichier: string, data: Uint8Array): ManifestFile {
  return {
    fichier,
    sha256: sha256Hex(data),
    octets: data.byteLength,
  };
}

export function buildManifest(input: {
  results: Uint8Array;
  files: readonly ManifestFile[];
}): { manifest: EvidenceManifest; bytes: Uint8Array; sha256: string } {
  const fichiers = [...input.files].sort((a, b) =>
    a.fichier < b.fichier ? -1 : a.fichier > b.fichier ? 1 : 0,
  );
  const manifest: EvidenceManifest = {
    fichiers,
    resultsSha256: sha256Hex(input.results),
  };
  const json = canonicaliser(manifest);
  const bytes = new TextEncoder().encode(json);
  return { manifest, bytes, sha256: sha256Hex(bytes) };
}

export interface FichierSource {
  fichier: string;
  contenu: Uint8Array;
}

export interface ManifesteConstruit {
  manifeste: Manifeste;
  /** Octets UTF-8 du manifeste canonique. Leur SHA-256 est l’empreinte. */
  canonique: string;
  empreinte: string;
}

/**
 * `manifest.json` = fichiers {fichier, sha256, octets} + empreinte de
 * `results.json`. Le SHA-256 du manifeste canonique est l’empreinte du rapport.
 * `results.json` n’est pas dans la liste : le PDF ne peut pas contenir sa
 * propre empreinte, et la page la retrouve ici (PLAN §12.3 et §12.6).
 */
export function construireManifeste(
  resultatsCanoniques: string,
  fichiers: readonly FichierSource[],
): ManifesteConstruit {
  const vus = new Set<string>();
  const liste: FichierManifeste[] = [];
  for (const fichier of fichiers) {
    if (!NOM.test(fichier.fichier) || fichier.fichier === 'results.json') {
      throw new Error(`nom de fichier refusé : ${fichier.fichier}`);
    }
    if (vus.has(fichier.fichier)) {
      throw new Error(`fichier en double : ${fichier.fichier}`);
    }
    vus.add(fichier.fichier);
    liste.push({
      fichier: fichier.fichier,
      sha256: sha256Hex(fichier.contenu),
      octets: fichier.contenu.byteLength,
    });
  }
  const manifeste: Manifeste = {
    fichiers: liste,
    resultsSha256: sha256Hex(new TextEncoder().encode(resultatsCanoniques)),
  };
  const canonique = manifesteCanonique(manifeste);
  return {
    manifeste,
    canonique,
    empreinte: sha256Hex(new TextEncoder().encode(canonique)),
  };
}

export { manifesteCanonique };
