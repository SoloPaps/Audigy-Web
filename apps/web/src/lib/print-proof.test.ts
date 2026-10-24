import { describe, expect, it } from 'vitest';
import { printAuditId, proofFromPayload } from './print-proof.js';

const ID = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

describe('vue impression', () => {
  it('lit l’identifiant dans le chemin', () => {
    expect(printAuditId(`/rapport/${ID}/imprimer`, '')).toBe(ID);
    expect(printAuditId('/rapport/imprimer/', `?id=${ID}`)).toBe(ID);
    expect(printAuditId('/rapport/imprimer', '')).toBeNull();
    expect(printAuditId('/rapport/pas-un-id/imprimer', '')).toBeNull();
  });

  it('lit l’empreinte et les captures horodatées', () => {
    const hash = 'ab'.repeat(32);
    expect(
      proofFromPayload({
        proof: {
          resultsSha256: hash,
          captures: [
            { viewport: 'desktop', capturedAt: '2026-10-23T12:30:00.000Z' },
            { viewport: 'mobile', capturedAt: 'pas une date' },
          ],
        },
      }),
    ).toEqual({
      resultsSha256: hash,
      captures: [
        { viewport: 'desktop', capturedAt: '2026-10-23T12:30:00.000Z' },
      ],
    });
    expect(proofFromPayload({ audit: { id: ID } })).toEqual({
      resultsSha256: null,
      captures: [],
    });
  });
});
