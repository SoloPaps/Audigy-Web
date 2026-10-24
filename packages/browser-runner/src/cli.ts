import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { isNetError } from '@audigy/net';
import { chromium } from 'playwright';
import { JobError, jobStoreFromEnv, runJob } from './job.js';
import { pdfFromPage } from './pdf.js';
import { type BrowserAuditOutput, runBrowserAudit } from './run.js';
import type { BrowserAuditResult } from './schema.js';

export const USAGE = `Usage :
  audigy-browser audit <url> [--out <dossier>] [--desktop-only] [--warc] [--json]
  audigy-browser job <auditId>

audit : charge la page dans Chromium (profil vierge, aucune interaction) et écrit
        browser.json et les captures dans le dossier (défaut : .audigy-browser/<hôte>).
        --warc écrit aussi accueil.warc (page d’accueil, sur demande).
job   : exécution GitHub Actions. Lit l'audit dans Supabase (SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY) et range les artefacts dans le seau privé.
        WARC=true demande l’archive. Le PDF est toujours produit.`;

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  cwd: string;
}

export interface CliDeps {
  run: typeof runBrowserAudit;
}

/** Résumé lisible, sans valeur de trace ni détail sensible. */
export function summaryLines(result: BrowserAuditResult): string[] {
  const desktop = result.loads.desktop;
  const lines = [
    `Page : ${result.target.finalUrl ?? result.target.url} (statut ${desktop.status ?? 'aucun'})`,
  ];
  if (desktop.eco)
    lines.push(
      `EcoIndex (ordinateur) : ${desktop.eco.domElements} éléments, ${desktop.eco.requests} requêtes, ${desktop.eco.transferBytes} octets`,
    );
  lines.push(
    `Traces avant consentement : ${result.preConsent.cookies.length} (dont ${result.preConsent.cookies.filter((c) => c.thirdParty).length} tierces)`,
    `Requêtes tierces avant consentement : ${result.preConsent.thirdPartyRequests} vers ${result.preConsent.thirdPartyHosts.length} hôtes`,
    `Bandeau de consentement : ${result.cmp.detected.map((c) => c.name).join(', ') || 'aucun reconnu'}`,
    `Erreurs console : ${result.console.filter((c) => !c.runnerCaused).length}`,
    `Contenu mixte : ${result.mixedContent.length}`,
  );
  if (result.axe)
    lines.push(`Règles axe en échec : ${result.axe.violations.length}`);
  for (const error of result.errors)
    lines.push(
      `Étape non réalisée (${error.step}, ${error.viewport}) : ${error.message}`,
    );
  return lines;
}

async function writeOutput(
  output: BrowserAuditOutput,
  dir: string,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'browser.json');
  await writeFile(file, `${JSON.stringify(output.result, null, 2)}\n`);
  for (const shot of output.screenshots)
    await writeFile(path.join(dir, shot.file), shot.data);
  if (output.warc)
    await writeFile(path.join(dir, output.warc.file), output.warc.data);
  return file;
}

async function renderProofPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    return await pdfFromPage(page);
  } finally {
    await browser.close();
  }
}

export async function main(
  argv: readonly string[],
  io: CliIo,
  deps: CliDeps = { run: runBrowserAudit },
): Promise<number> {
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(argv);
  } catch {
    io.err(USAGE);
    return 2;
  }
  const [command, arg] = parsed.positionals;
  if (parsed.values.help || !command || !arg) {
    (parsed.values.help ? io.out : io.err)(USAGE);
    return parsed.values.help ? 0 : 2;
  }
  const botUrl = io.env.APP_BASE_URL || undefined;

  try {
    if (command === 'audit') {
      const output = await deps.run({
        url: arg,
        ...(botUrl ? { botUrl } : {}),
        ...(parsed.values['desktop-only'] ? { viewports: ['desktop'] } : {}),
        ...(parsed.values.warc ? { warc: true } : {}),
      });
      if (parsed.values.json) {
        io.out(JSON.stringify(output.result, null, 2));
        return 0;
      }
      const host = new URL(output.result.target.url).hostname;
      const dir = path.resolve(
        io.cwd,
        parsed.values.out ?? path.join('.audigy-browser', host),
      );
      const file = await writeOutput(output, dir);
      for (const line of summaryLines(output.result)) io.out(line);
      io.out(`Résultat : ${path.relative(io.cwd, file)}`);
      return output.result.loads.desktop.error ? 1 : 0;
    }
    if (command === 'job') {
      const summary = await runJob(arg, {
        store: jobStoreFromEnv(io.env),
        run: deps.run,
        ...(botUrl ? { botUrl, verifyOrigin: botUrl } : {}),
        ...(io.env.WARC === 'true' ? { warc: true } : {}),
        renderPdf: renderProofPdf,
      });
      io.out(
        `Audit ${summary.auditId} : ${summary.artifacts.length} artefacts, ${summary.errors} étapes non réalisées`,
      );
      return 0;
    }
  } catch (error) {
    if (isNetError(error)) io.err(`Adresse refusée : ${error.code}`);
    else if (error instanceof JobError)
      io.err(`${error.code} : ${error.message}`);
    else
      io.err(
        error instanceof Error
          ? (error.message.split('\n')[0] ?? '')
          : 'Erreur',
      );
    return 1;
  }
  io.err(USAGE);
  return 2;
}

function parse(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      out: { type: 'string' },
      'desktop-only': { type: 'boolean' },
      json: { type: 'boolean' },
      warc: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
}
