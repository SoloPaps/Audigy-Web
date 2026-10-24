/** Plafonds de stockage (PLAN §8, §12). Le PDF reste sous 1 Mo. */
export const ARTIFACT_LIMITS = {
  screenshotBytes: 200 * 1024,
  pdfBytes: 1_000_000,
  warcBytes: 5 * 1024 * 1024,
} as const;

export type CappedArtifact = keyof typeof ARTIFACT_LIMITS;

const LIMIT_OF: Record<CappedArtifact, number> = {
  screenshotBytes: ARTIFACT_LIMITS.screenshotBytes,
  pdfBytes: ARTIFACT_LIMITS.pdfBytes,
  warcBytes: ARTIFACT_LIMITS.warcBytes,
};

export class ArtifactTooLargeError extends Error {
  readonly artifact: 'screenshot' | 'pdf' | 'warc';
  readonly bytes: number;
  readonly limit: number;

  constructor(
    artifact: 'screenshot' | 'pdf' | 'warc',
    bytes: number,
    limit: number,
  ) {
    super(`${artifact}:${bytes}:${limit}`);
    this.name = 'ArtifactTooLargeError';
    this.artifact = artifact;
    this.bytes = bytes;
    this.limit = limit;
  }
}

export function limitFor(artifact: 'screenshot' | 'pdf' | 'warc'): number {
  if (artifact === 'screenshot') return LIMIT_OF.screenshotBytes;
  if (artifact === 'pdf') return LIMIT_OF.pdfBytes;
  return LIMIT_OF.warcBytes;
}

export function assertArtifactSize(
  artifact: 'screenshot' | 'pdf' | 'warc',
  bytes: number,
): void {
  const limit = limitFor(artifact);
  if (bytes > limit) throw new ArtifactTooLargeError(artifact, bytes, limit);
}
