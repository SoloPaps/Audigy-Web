import { assertArtifactSize } from '@audigy/evidence';
import type { Page } from 'playwright';

/** Réglages communs de `page.pdf()` : A4, fond blanc, texte balisé. */
export const PDF_PRINT = {
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
} as const;

export async function pdfFromPage(page: Page): Promise<Buffer> {
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => {
    const fonts = (
      globalThis as unknown as { document: { fonts: { ready: Promise<void> } } }
    ).document.fonts;
    return fonts.ready;
  });
  const data = Buffer.from(await page.pdf(PDF_PRINT));
  assertArtifactSize('pdf', data.length);
  return data;
}

/** Le PDF ne doit pas contenir sa propre empreinte (PLAN §12.6). */
export function pdfContainsHex(pdf: Uint8Array, hex: string): boolean {
  return Buffer.from(pdf).toString('latin1').toLowerCase().includes(hex);
}
