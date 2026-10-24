<script lang="ts">
import QRCode from 'qrcode';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { REPORT_DOMAINS } from '../lib/domains.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { formatReportStamp } from '../lib/format-report-stamp.js';
import { loginHref } from '../lib/nav.js';
import { printAuditId, proofFromPayload } from '../lib/print-proof.js';
import {
  categoryItems,
  reportFindings,
  scoredDomainCount,
} from '../lib/report-model.js';
import { verdictCopy } from '../lib/verdict.js';
import CategoryList from './CategoryList.svelte';
import FindingList from './FindingList.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ScoreGauge from './ScoreGauge.svelte';

let phase = $state<'loading' | 'message' | 'ready'>('loading');
let message = $state(t('report.loading'));
let needLogin = $state(false);
let payload = $state<AuditPayload | null>(null);
let qr = $state('');
let auditId = '';

const proof = $derived(proofFromPayload(payload));
const items = $derived(
  payload
    ? categoryItems(payload.domains, payload.audit.id, payload.findings)
    : [],
);
const shown = $derived.by(() => {
  if (!payload) return [];
  return reportFindings(
    payload,
    fixesFor(hostingOf(payload.audit.site.hosting)),
  );
});
const global = $derived(payload?.audit.globalScore ?? null);
const verdict = $derived(verdictCopy(global, shown));
const observed = $derived.by(() => {
  const raw = payload?.audit.finishedAt ?? payload?.audit.createdAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
});
const verifyHref = $derived(
  auditId === '' ? '' : `${location.origin}/verifier/${auditId}`,
);
const captures = $derived.by(() => {
  const rows =
    proof.captures.length > 0
      ? proof.captures
      : [
          { viewport: 'desktop' as const, capturedAt: observed.toISOString() },
          { viewport: 'mobile' as const, capturedAt: observed.toISOString() },
        ];
  return rows.map((row) => {
    const date = formatReportStamp(new Date(row.capturedAt));
    return row.viewport === 'desktop'
      ? t('print.capture.desktop', { date })
      : t('print.capture.mobile', { date });
  });
});

onMount(() => {
  void load();
});

async function load(): Promise<void> {
  auditId = printAuditId(location.pathname, location.search) ?? '';
  if (auditId === '') {
    phase = 'message';
    message = t('report.missing');
    return;
  }
  const session = await currentSession();
  if (!session) {
    phase = 'message';
    needLogin = true;
    message = t('print.login');
    return;
  }
  const result = await readAudit(session.access_token, auditId);
  if (!result.ok) {
    phase = 'message';
    message = result.status === 404 ? t('report.missing') : result.message;
    return;
  }
  const status = result.payload.audit.status;
  if (status === 'queued' || status === 'running') {
    phase = 'message';
    message = t('report.pending');
    return;
  }
  payload = result.payload;
  phase = 'ready';
  try {
    const href = `${location.origin}/verifier/${auditId}`;
    const svg = await QRCode.toString(href, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#1b1f24', light: '#ffffff' },
    });
    qr = svg.replace('<svg ', '<svg aria-hidden="true" ');
  } catch {
    qr = '';
  }
  window.print();
}

function onPrint(event: MouseEvent): void {
  event.preventDefault();
  window.print();
}
</script>

<h1>{t('print.heading')}</h1>

{#if phase === 'loading'}
  <p role="status" aria-live="polite">{message}</p>
{:else if phase === 'message'}
  <p role="status">{message}</p>
  {#if needLogin}
    <p>
      <a class="link-action" href={loginHref(`${location.pathname}${location.search}`)}>{t('nav.login')}</a>
    </p>
  {:else}
    <p><a class="link-action" href="/sites">{t('nav.sites')}</a></p>
  {/if}
{:else if payload}
  <p class="no-print export-links">
    <a class="link-action" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.back')}</a>
    <a class="link-action" href={`/rapport/${payload.audit.id}/imprimer`} onclick={onPrint}>{t('print.link')}</a>
  </p>
  <p class="no-print hint">{t('print.pdf')}</p>
  <header class="verdict">
    <ScoreGauge domain={t('domain.global')} score={global} size="hero" />
    <div>
      <p class="kicker">{payload.audit.site.url}</p>
      <h2>{verdict.headline}</h2>
      <p class="detail">{verdict.detail}</p>
      <p class="hint">
        {t('report.coverage', {
          scored: scoredDomainCount(items),
          total: REPORT_DOMAINS.length,
        })}
      </p>
    </div>
  </header>
  <h2>{t('section.categories')}</h2>
  <CategoryList {items} />
  <h2>{t('section.findings')}</h2>
  <FindingList findings={shown} url={payload.audit.site.url} />
  <h2>{t('section.verify')}</h2>
  <dl class="proof">
    <dt>{t('print.id')}</dt>
    <dd class="mono">{payload.audit.id}</dd>
    <dt>{t('print.results')}</dt>
    <dd class="mono">{proof.resultsSha256 ?? t('print.pending')}</dd>
    <dt>{t('print.date')}</dt>
    <dd><time datetime={observed.toISOString()}>{formatReportStamp(observed)}</time></dd>
    <dt>{t('print.verify')}</dt>
    <dd class="mono">{verifyHref}</dd>
  </dl>
  {#if qr}
    <div class="qr" role="img" aria-label={t('print.qr')}>{@html qr}</div>
  {/if}
  <h2>{t('print.captures')}</h2>
  <ul>
    {#each captures as line (line)}
      <li>{line}</li>
    {/each}
  </ul>
  <PreuveMentions />
{/if}

<style>
  .verdict {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-6) var(--space-7);
    align-items: center;
    padding-bottom: var(--space-6);
    border-bottom: var(--border) solid var(--line);
  }

  .detail {
    max-width: var(--line-length);
    font-size: var(--text-lg);
  }

  .export-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .proof {
    display: grid;
    grid-template-columns: minmax(0, 16rem) minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    overflow-wrap: anywhere;
  }

  .qr {
    width: 8rem;
    height: 8rem;
    margin-top: var(--space-4);
  }

  .qr :global(svg) {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 768px) {
    .verdict,
    .proof {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
