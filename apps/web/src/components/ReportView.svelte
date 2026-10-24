<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import {
  domainPlain,
  domainSentence,
  isKnownDomain,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import { topActions } from '../lib/findings.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { GLOBAL_SERIES, type HistoryView } from '../lib/history.js';
import { loginHref } from '../lib/nav.js';
import {
  categoryItems,
  reportFindings,
  scoredDomainCount,
} from '../lib/report-model.js';
import { levelForScore } from '../lib/score.js';
import { loadSiteHistory } from '../lib/site-history.js';
import { verdictCopy } from '../lib/verdict.js';
import CategoryList from './CategoryList.svelte';
import FindingList from './FindingList.svelte';
import HistoryPanel from './HistoryPanel.svelte';
import ReportFooter from './ReportFooter.svelte';
import ScoreGauge from './ScoreGauge.svelte';

interface Props {
  mode?: 'report' | 'domain';
}

let { mode = 'report' }: Props = $props();

let phase = $state<'loading' | 'message' | 'ready'>('loading');
let message = $state(t('report.loading'));
let payload = $state<AuditPayload | null>(null);
let domainId = $state('');
let history = $state<HistoryView | null>(null);

const items = $derived(
  payload ? categoryItems(payload.domains, payload.audit.id) : [],
);
const shown = $derived.by(() => {
  if (!payload) return [];
  const fixes = fixesFor(hostingOf(payload.audit.site.hosting));
  if (mode === 'domain') return reportFindings(payload, fixes, domainId);
  return reportFindings(payload, fixes);
});
const global = $derived(payload?.audit.globalScore ?? null);
const verdict = $derived(verdictCopy(global, shown));
const actions = $derived(topActions(shown));
const domainRow = $derived(items.find((item) => item.id === domainId));
const domainScore = $derived(domainRow?.score ?? null);
const stamp = $derived.by(() => {
  const raw = payload?.audit.finishedAt ?? payload?.audit.createdAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
});

onMount(() => {
  let cancelled = false;
  void load();
  return () => {
    cancelled = true;
  };

  async function load(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    domainId = params.get('domaine') ?? '';
    if (!id || (mode === 'domain' && !isKnownDomain(domainId))) {
      phase = 'message';
      message =
        mode === 'domain' ? t('report.domain.missing') : t('report.missing');
      return;
    }
    const session = await currentSession();
    if (!session) {
      location.replace(loginHref(`${location.pathname}${location.search}`));
      return;
    }
    const result = await readAudit(session.access_token, id);
    if (!result.ok) {
      phase = 'message';
      message = result.status === 404 ? t('report.missing') : result.message;
      return;
    }
    const status = result.payload.audit.status;
    if (status === 'queued' || status === 'running') {
      phase = 'message';
      message = t('report.pending');
      payload = result.payload;
      return;
    }
    payload = result.payload;
    phase = 'ready';
    const loaded = await loadSiteHistory(
      result.payload.audit.site.id,
      result.payload.audit.site.hosting,
    );
    if (!cancelled) history = loaded;
  }
});
</script>

{#if phase === 'loading'}
  <h1>{mode === 'domain' ? t('domain.heading') : t('report.heading')}</h1>
  <p role="status" aria-live="polite">{message}</p>
{:else if phase === 'message'}
  <h1>{mode === 'domain' ? t('domain.heading') : t('report.heading')}</h1>
  <p role="status">{message}</p>
  {#if payload}
    <p>
      <a href={`/progression?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.progress')}</a>
    </p>
  {:else}
    <p><a href="/sites">{t('nav.sites')}</a></p>
  {/if}
{:else if payload}
  {#if mode === 'domain'}
    <p><a href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.back')}</a></p>
    <header class="verdict">
      <ScoreGauge domain={domainPlain(domainId)} score={domainScore} size="hero" />
      <div>
        <p class="kicker">{payload.audit.site.url}</p>
        <h1>{domainPlain(domainId)}</h1>
        <p class="detail">{domainSentence(domainId, levelForScore(domainScore))}</p>
      </div>
    </header>
  {:else}
    <header class="verdict">
      <ScoreGauge domain={t('domain.global')} score={global} size="hero" />
      <div>
        <p class="kicker">{payload.audit.site.url}</p>
        <h1>{verdict.headline}</h1>
        <p class="detail">{verdict.detail}</p>
        <p class="hint">
          {t('report.coverage', {
            scored: scoredDomainCount(items),
            total: REPORT_DOMAINS.length,
          })}
        </p>
        {#if actions.length > 0}
          <p id="actions-label" class="hint">{t('verdict.actions')}</p>
          <ol class="actions" aria-labelledby="actions-label">
            {#each actions as item (item.id)}
              <li><a href={`#finding-${item.id}`}>{item.title}</a></li>
            {/each}
          </ol>
        {/if}
      </div>
    </header>
    <h2>{t('section.categories')}</h2>
    <CategoryList {items} />
  {/if}

  <h2 id="corrections">{t('section.findings')}</h2>
  <FindingList findings={shown} />

  {#if mode === 'report' && history}
    <h2>{t('section.table')}</h2>
    <HistoryPanel
      series={history.series}
      points={history.points}
      audits={history.snapshots}
      initialSeries={[GLOBAL_SERIES]}
    />
  {/if}

  <p class="no-print">
    <a href={`/rapport/${payload.audit.id}/imprimer`}>{t('print.link')}</a>
  </p>
  <h2 id="verification">{t('section.verify')}</h2>
  <p class="prose">{t('verify.lead')}</p>
  <p class="prose">{t('verify.pending')}</p>
  <p class="prose">{t('verify.id')}</p>
  <p class="prose">{t('verify.legal')}</p>
  <p class="prose">{t('verify.legal.value')}</p>
  <p class="prose">{t('verify.observed')}</p>
  <ReportFooter
    url={payload.audit.site.url}
    at={stamp}
    methodVersion={payload.audit.methodVersion}
    fingerprint={payload.audit.id}
    fingerprintKind="id"
    verifyHref="#verification"
  />
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
    margin-bottom: var(--space-3);
    font-size: var(--text-lg);
  }

  .actions {
    margin: 0;
    padding-inline-start: var(--space-5);
  }

  .actions li + li {
    margin-top: var(--space-2);
  }

  @media (max-width: 768px) {
    .verdict {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
