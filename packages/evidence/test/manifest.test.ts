import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_LIMITS,
  ArtifactTooLargeError,
  assertArtifactSize,
  buildManifest,
  manifestFile,
  sha256Hex,
} from '../src/index.js';

const results = new TextEncoder().encode('{"a":1}');

describe('manifeste', () => {
  it('hache chaque artefact et canonise le manifeste', () => {
    const capture = new TextEncoder().encode('webp');
    const pdf = new TextEncoder().encode('%PDF');
    const built = buildManifest({
      results,
      files: [
        manifestFile('rapport.pdf', pdf),
        manifestFile('capture-desktop.webp', capture),
      ],
    });
    expect(built.manifest.resultsSha256).toBe(sha256Hex(results));
    expect(built.manifest.fichiers.map((file) => file.fichier)).toEqual([
      'capture-desktop.webp',
      'rapport.pdf',
    ]);
    expect(built.manifest.fichiers[0]).toEqual({
      fichier: 'capture-desktop.webp',
      sha256: sha256Hex(capture),
      octets: capture.byteLength,
    });
    expect(built.sha256).toBe(sha256Hex(built.bytes));
    expect(new TextDecoder().decode(built.bytes)).toBe(
      `{"fichiers":[{"fichier":"capture-desktop.webp","octets":4,"sha256":"${sha256Hex(capture)}"},{"fichier":"rapport.pdf","octets":4,"sha256":"${sha256Hex(pdf)}"}],"resultsSha256":"${sha256Hex(results)}"}`,
    );
  });

  it('change l’empreinte si un octet d’artefact change', () => {
    const left = buildManifest({
      results,
      files: [manifestFile('rapport.pdf', new Uint8Array([1, 2, 3]))],
    });
    const right = buildManifest({
      results,
      files: [manifestFile('rapport.pdf', new Uint8Array([1, 2, 4]))],
    });
    expect(left.sha256).not.toBe(right.sha256);
    expect(left.manifest.fichiers[0]?.sha256).not.toBe(
      right.manifest.fichiers[0]?.sha256,
    );
  });

  it('refuse un fichier au-dessus du plafond', () => {
    expect(() =>
      assertArtifactSize('pdf', ARTIFACT_LIMITS.pdfBytes + 1),
    ).toThrow(ArtifactTooLargeError);
    expect(() =>
      assertArtifactSize('warc', ARTIFACT_LIMITS.warcBytes),
    ).not.toThrow();
    expect(() =>
      assertArtifactSize('screenshot', ARTIFACT_LIMITS.screenshotBytes + 1),
    ).toThrow(ArtifactTooLargeError);
  });
});
