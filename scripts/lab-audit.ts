/**
 * Audit de bout en bout sous `netlify dev`, sur le labo local.
 * `pnpm lab:audit [adresse] [origine] [--browser]` : connexion du propriétaire local
 * (lien magique généré par l'admin du Supabase LOCAL), POST /api/audits deux fois de
 * suite (double clic), puis GET /api/audits/:id jusqu'à `done` ou `failed`.
 * `--browser` : dès `partial`, lance le vrai runner (`runJob`, Chromium) sur le labo,
 * comme le ferait `browser-audit.yml`. `netlify dev` doit tourner avec
 * `AUDIGY_LOCAL_RUNNER=true`. Aucun jeton n'est affiché.
 */
import {
  BROWSER_BUDGET,
  jobStoreFromEnv,
  runBrowserAudit,
  runJob,
} from '@audigy/browser-runner';
import { createRequestBudget } from '@audigy/net';
import { labFromEnv, labNet } from '@audigy/orchestrator';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LAB_FILE } from '../fixtures/lab.js';
import { localSupabaseStatus } from '../packages/db/test/local.js';

const withBrowser = process.argv.includes('--browser');
const args = process.argv.slice(2).filter((arg) => arg !== '--browser');
const url = args[0] ?? 'https://bon.audigy.test/';
const origin = args[1] ?? 'http://localhost:8888';
const OWNER_EMAIL = 'proprietaire@localhost';
const TIMEOUT_MS = 5 * 60_000;

const local = localSupabaseStatus();
const apiHost = new URL(local.apiUrl).hostname;
if (apiHost !== '127.0.0.1' && apiHost !== 'localhost') {
  console.error('Supabase non local : arrêt.');
  process.exit(2);
}

const opts = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;
const admin = createClient(local.apiUrl, local.serviceRoleKey, opts);
const anon = createClient(local.apiUrl, local.anonKey, opts);

const link = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: OWNER_EMAIL,
});
const hashed = link.data.properties?.hashed_token;
if (link.error || !hashed) {
  console.error('Lien magique local impossible.');
  process.exit(1);
}
const session = await anon.auth.verifyOtp({
  token_hash: hashed,
  type: 'magiclink',
});
const token = session.data.session?.access_token;
if (session.error || !token) {
  console.error('Connexion locale impossible.');
  process.exit(1);
}
const headers = {
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
};

const post = () =>
  fetch(`${origin}/api/audits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });
const [first, second] = await Promise.all([post(), post()]);
const a = (await first.json()) as { auditId?: string };
const b = (await second.json()) as { auditId?: string };
console.log(`POST /api/audits : ${first.status} puis ${second.status}`);
if (!a.auditId || a.auditId !== b.auditId) {
  console.error('Double clic : deux audits différents ou aucun audit.');
  process.exit(1);
}
console.log(`Audit ${a.auditId} (un seul pour les deux clics)`);

interface View {
  audit: { status: string; globalScore: number | null; coverage: number };
  domains: { domain: string; score: number | null }[];
  findings: { status: string; checkId: string; reason: string | null }[];
}
async function runLocalRunner(auditId: string): Promise<void> {
  const lab = labFromEnv(
    { AUDIGY_LAB: process.env.AUDIGY_LAB ?? DEFAULT_LAB_FILE },
    { requireNetlifyDev: false },
  );
  if (!lab) throw new Error('labo absent');
  const fetch = labNet(lab, createRequestBudget(BROWSER_BUDGET)).fetch;
  const summary = await runJob(auditId, {
    store: jobStoreFromEnv({
      SUPABASE_URL: local.apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
    }),
    run: (options) => runBrowserAudit({ ...options, fetch }),
  });
  console.log(`Runner local : ${summary.artifacts.length} artefacts déposés`);
}

const started = Date.now();
let last = '';
let view: View | null = null;
let runnerStarted = false;
while (Date.now() - started < TIMEOUT_MS) {
  const res = await fetch(`${origin}/api/audits/${a.auditId}`, { headers });
  view = (await res.json()) as View;
  if (view.audit.status !== last) {
    last = view.audit.status;
    console.log(`Statut : ${last}`);
  }
  if (last === 'done' || last === 'failed') break;
  if (withBrowser && last === 'partial' && !runnerStarted) {
    runnerStarted = true;
    await runLocalRunner(a.auditId);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (!view || (last !== 'done' && last !== 'failed')) {
  console.error('Délai dépassé.');
  process.exit(1);
}
console.log(`Score global : ${view.audit.globalScore ?? 'non testé'}`);
for (const d of view.domains)
  console.log(`- ${d.domain} : ${d.score ?? 'non testé'}`);
const untested = view.findings.filter((f) => f.status === 'untested');
console.log(`Non testés : ${untested.length}`);
for (const f of untested) console.log(`- ${f.checkId} : ${f.reason}`);
process.exit(last === 'done' ? 0 : 1);
