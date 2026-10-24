import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, describe, expect, it } from 'vitest';
import { t } from '../../../apps/web/src/i18n/index.js';
import { pdfContainsHex, pdfFromPage } from '../src/pdf.js';
import { renderPrintHtml } from '../src/print-html.js';
import { buildHomepageWarc } from '../src/warc.js';

const HASH = 'cd'.repeat(32);
const VIEWER = fileURLToPath(
  new URL('../node_modules/replaywebpage/', import.meta.url),
);
const htmlBody =
  '<!doctype html><html lang="fr"><head><title>Accueil</title></head><body><h1>Bonjour archive</h1></body></html>';

let browser: Browser | null = null;

afterAll(async () => {
  await browser?.close();
});

async function chromiumPage(): Promise<Page> {
  browser ??= await chromium.launch({ headless: true });
  return browser.newPage();
}

describe('PDF de la vue à imprimer', () => {
  it('reste lisible en noir et blanc, avec polices embarquées, sous 1 Mo', async () => {
    const html = await renderPrintHtml({
      auditId: '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10',
      targetUrl: 'https://exemple.fr/',
      observedAt: new Date('2026-10-23T12:30:00.000Z'),
      resultsSha256: HASH,
      verifyUrl:
        'https://audigy.exemple/verifier/6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10',
      captures: [
        {
          viewport: 'desktop',
          capturedAt: new Date('2026-10-23T12:30:00.000Z'),
        },
        {
          viewport: 'mobile',
          capturedAt: new Date('2026-10-23T12:30:02.000Z'),
        },
      ],
    });
    expect(html).toContain(t('print.legal'));
    expect(html).toContain(t('print.eidas'));
    expect(html).toContain(HASH);
    expect(html).toContain('data:font/woff2;base64,');
    const page = await chromiumPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const paint = await page.evaluate(() => {
        const body = (
          globalThis as unknown as {
            document: { body: unknown };
            getComputedStyle: (node: unknown) => {
              color: string;
              backgroundColor: string;
            };
          }
        ).getComputedStyle(
          (globalThis as unknown as { document: { body: unknown } }).document
            .body,
        );
        return { color: body.color, background: body.backgroundColor };
      });
      expect(paint).toEqual({
        color: 'rgb(27, 31, 36)',
        background: 'rgb(255, 255, 255)',
      });
      expect(await page.locator('body').textContent()).toContain(
        t('print.legal'),
      );
      const pdf = await pdfFromPage(page);
      expect(pdf.length).toBeLessThanOrEqual(1_000_000);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.toString('latin1')).toMatch(/\/FontFile2|\/FontFile3/);
      const own = createHash('sha256').update(pdf).digest('hex');
      expect(pdfContainsHex(pdf, own)).toBe(false);
    } finally {
      await page.close();
    }
  });
});

describe('rejeu ReplayWeb.page', () => {
  it('affiche la page d’accueil archivée', async () => {
    const warc = await buildHomepageWarc({
      homepageUrl: 'https://exemple.test/',
      date: new Date('2026-10-24T08:00:00.000Z'),
      exchanges: [
        {
          url: 'https://exemple.test/',
          status: 200,
          headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
          body: new TextEncoder().encode(htmlBody),
        },
      ],
    });
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/accueil.warc') {
        res.setHeader('content-type', 'application/warc');
        res.end(Buffer.from(warc));
        return;
      }
      if (url.pathname === '/replay' || url.pathname === '/replay/') {
        const data = await readFile(join(VIEWER, 'index.html'));
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(data);
        return;
      }
      if (url.pathname === '/lire.html') {
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><script src="/ui.js"></script></head>
<body>
<replay-web-page source="/accueil.warc" url="https://exemple.test/" embed="default"></replay-web-page>
</body></html>`);
        return;
      }
      const relative = url.pathname.replace(/^\/replay\//u, '/');
      const file = join(VIEWER, relative.replace(/^\/+/u, ''));
      try {
        const data = await readFile(file);
        res.setHeader('content-type', typeOf(file));
        res.end(data);
      } catch {
        res.statusCode = 404;
        res.end('absent');
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const page = await chromiumPage();
    try {
      await page.goto(`http://127.0.0.1:${port}/lire.html`);
      await page.waitForSelector('iframe', { timeout: 20_000 });
      let seen = '';
      const started = Date.now();
      while (Date.now() - started < 20_000) {
        const texts = await Promise.all(
          page.frames().map((frame) =>
            frame
              .locator('body')
              .textContent()
              .catch(() => ''),
          ),
        );
        seen = texts.join('\n');
        if (seen.includes('Bonjour archive')) break;
        await page.waitForTimeout(250);
      }
      expect(seen).toContain('Bonjour archive');
    } finally {
      await page.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }, 60_000);
});

function typeOf(file: string): string {
  const ext = extname(file);
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.json') return 'application/json';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.wasm') return 'application/wasm';
  return 'application/octet-stream';
}
