import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { formatDateTime, t } from '../../../apps/web/src/i18n/index.js';

const FONT_DIR = fileURLToPath(
  new URL('../../../apps/web/src/fonts/', import.meta.url),
);

export interface PrintCapture {
  viewport: 'desktop' | 'mobile';
  capturedAt: Date;
}

export interface PrintDocumentInput {
  auditId: string;
  targetUrl: string;
  observedAt: Date;
  resultsSha256: string;
  verifyUrl: string;
  captures: readonly PrintCapture[];
}

/** HTML de la vue à imprimer : polices embarquées, encre noire, fond blanc. */
export async function renderPrintHtml(
  input: PrintDocumentInput,
): Promise<string> {
  const qr = await QRCode.toString(input.verifyUrl, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#1b1f24', light: '#ffffff' },
  });
  const svg = qr.replace('<svg ', '<svg aria-hidden="true" ');
  const captures = input.captures
    .map((capture) => {
      const key =
        capture.viewport === 'desktop'
          ? 'print.capture.desktop'
          : 'print.capture.mobile';
      return `<li>${escapeHtml(t(key, { date: stamp(capture.capturedAt) }))}</li>`;
    })
    .join('');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('print.heading'))}</title>
<style>
${fontFaces()}
@page { size: A4; margin: 16mm; }
html { font-size: 100%; }
body {
  margin: 0;
  background: #ffffff;
  color: #1b1f24;
  font-family: "Atkinson Hyperlegible Next", sans-serif;
  font-size: 1rem;
  line-height: 1.5;
}
h1 { font-size: 1.75rem; line-height: 1.2; font-weight: 700; }
h2 { font-size: 1.125rem; line-height: 1.2; font-weight: 600; }
p, li { max-width: 70ch; }
.mono, code {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
dl { display: grid; grid-template-columns: 14rem minmax(0, 1fr); gap: 0.5rem 1rem; }
dt { font-weight: 600; }
.qr { width: 8rem; height: 8rem; }
.qr svg { width: 100%; height: 100%; }
</style>
</head>
<body>
<h1>${escapeHtml(t('print.heading'))}</h1>
<p>${escapeHtml(input.targetUrl)}</p>
<h2>${escapeHtml(t('section.verify'))}</h2>
<dl>
<dt>${escapeHtml(t('print.id'))}</dt>
<dd class="mono">${escapeHtml(input.auditId)}</dd>
<dt>${escapeHtml(t('print.results'))}</dt>
<dd class="mono">${escapeHtml(input.resultsSha256)}</dd>
<dt>${escapeHtml(t('print.date'))}</dt>
<dd><time datetime="${escapeHtml(input.observedAt.toISOString())}">${escapeHtml(stamp(input.observedAt))}</time></dd>
<dt>${escapeHtml(t('print.verify'))}</dt>
<dd class="mono">${escapeHtml(input.verifyUrl)}</dd>
</dl>
<div class="qr" role="img" aria-label="${escapeHtml(t('print.qr'))}">${svg}</div>
<h2>${escapeHtml(t('print.captures'))}</h2>
<ul>${captures}</ul>
<p>${escapeHtml(t('print.legal'))}</p>
<p>${escapeHtml(t('print.observed'))}</p>
<p>${escapeHtml(t('print.eidas'))}</p>
</body>
</html>`;
}

function stamp(date: Date): string {
  return formatDateTime(date);
}

function fontFaces(): string {
  return [
    face(
      'Atkinson Hyperlegible Next',
      400,
      'atkinson-hyperlegible-next-latin-400-normal.woff2',
    ),
    face(
      'Atkinson Hyperlegible Next',
      700,
      'atkinson-hyperlegible-next-latin-700-normal.woff2',
    ),
    face('JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal.woff2'),
  ].join('\n');
}

function face(family: string, weight: number, file: string): string {
  const bytes = readFileSync(join(FONT_DIR, file));
  const b64 = Buffer.from(bytes).toString('base64');
  return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
