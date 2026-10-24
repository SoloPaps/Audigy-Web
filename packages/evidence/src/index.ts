/**
 * @audigy/evidence — empreinte du rapport (PLAN §12).
 *
 * - `sha256Hex`, `manifestFile`, `buildManifest` : manifeste JCS
 *   `{ fichiers: { fichier, sha256, octets }[], resultsSha256 }`.
 *   Le SHA-256 de ces octets est l’empreinte du rapport.
 * - `ARTIFACT_LIMITS`, `assertArtifactSize` : captures 200 Ko, PDF 1 Mo, WARC 5 Mo.
 */
export {
  ARTIFACT_LIMITS,
  ArtifactTooLargeError,
  assertArtifactSize,
  type CappedArtifact,
  limitFor,
} from './limits.js';
export {
  buildManifest,
  type EvidenceManifest,
  type ManifestFile,
  manifestFile,
  sha256Hex,
} from './manifest.js';
