import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';

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

export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
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
  const json = canonicalize(manifest);
  if (json === undefined) throw new Error('manifeste non canonique');
  const bytes = new TextEncoder().encode(json);
  return { manifest, bytes, sha256: sha256Hex(bytes) };
}
