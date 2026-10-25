<script lang="ts">
import { onMount } from 'svelte';
import { formatNumber } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { recognizedStack } from '../lib/brief.js';
import { currentSession } from '../lib/browser-session.js';
import {
  domainPlain,
  domainSentence,
  isKnownDomain,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import { levelForStatus, topActions } from '../lib/findings.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { GLOBAL_SERIES, type HistoryView } from '../lib/history.js';
import { loginHref } from '../lib/nav.js';
import { formatRating } from '../lib/places-api.js';
import { progressLive } from '../lib/progress-live.js';
import { relaunchHref } from '../lib/relaunch.js';
import {
  markdownFilename,
  renderMarkdown,
  saveTextFile,
} from '../lib/report-export.js';
import {
  categoryItems,
  reportFindings,
  reportRows,
  reputationAside,
  scoredDomainCount,
} from '../lib/report-model.js';
import { levelForScore, levelLabel } from '../lib/score.js';
import { loadSiteHistory } from '../lib/site-history.js';
import { explainUntested } from '../lib/untested-cause.js';
import { verdictCopy } from '../lib/verdict.js';
import AuditOverlay from './AuditOverlay.svelte';
import CategoryList from './CategoryList.svelte';
import EmptyState from './EmptyState.svelte';
import FindingList from './FindingList.svelte';
import HistoryPanel from './HistoryPanel.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ReportFooter from './ReportFooter.svelte';
import ScoreGauge from './ScoreGauge.svelte';
import UntestedCause from './UntestedCause.svelte';

interface Props {
  mode?: 'report' | 'domain';
}

let { mode = 'report' }: Props = $props();

let phase = $state<'loading' | 'message' | 'ready'>('loading');
let message = $state(t('report.loading'));
let payload = $state<AuditPayload | null>(null);
let domainId = $state('');
let history = $state<HistoryView | null>(null);
let historyReady = $state(false);

const items = $derived(
  payload
    ? categoryItems(payload.domains, payload.audit.id, payload.findings)
    : [],
);
const shown = $derived.by(() => {
  if (!payload) return [];
  const fixes = fixesFor(hostingOf(payload.audit.site.hosting));
  if (mode === 'domain') return reportFindings(payload, fixes, domainId);
  return reportFindings(payload, fixes);
});
const global = $derived(payload?.audit.globalScore ?? null);
const aside = $derived(payload ? reputationAside(payload) : null);
const verdict = $derived(verdictCopy(global, shown));
const actions = $derived(topActions(shown));
const domainRow = $derived(items.find((item) => item.id === domainId));
const domainScore = $derived(
  payload?.domains.find((row) => row.domain === domainId)?.score ??
    domainRow?.score ??
    null,
);
const domainUntested = $derived.by(() => {
  if (!payload || mode !== 'domain' || domainScore !== null) return null;
  const row = payload.domains.find((item) => item.domain === domainId);
  return explainUntested({
    coverage: row?.coverage ?? null,
    findings: payload.findings.filter((item) => item.domain === domainId),
  });
});
const finishedNames = $derived(
  (payload?.domains ?? [])
    .filter((domain) => typeof domain.score === 'number')
    .map((domain) => domainPlain(domain.domain)),
);
const stamp = $derived.by(() => {
  const raw = payload?.audit.finishedAt ?? payload?.audit.createdAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
});

function downloadMarkdown(event: MouseEvent): void {
  event.preventDefault();
  if (!payload) return;
  const file = markdownFilename(payload.audit.site.url, stamp);
  saveTextFile(
    file,
    renderMarkdown({
      url: payload.audit.site.url,
      at: stamp,
      methodVersion: payload.audit.methodVersion,
      globalScore: global,
      publicView: false,
      domains: items.map((item) => ({
        label: item.label,
        score: item.score,
        detail: item.detail,
        coverageNote: item.coverageNote,
        causes: item.causes
          ? {
              primary: item.causes.primary?.text ?? null,
              others: item.causes.others.map((line) => line.text),
              closing: item.causes.closing,
            }
          : null,
      })),
      findings: shown.map((finding) => ({
        title: finding.title,
        statusLabel: levelLabel(levelForStatus(finding.status)),
        statement: finding.why,
        limit: finding.limit ?? null,
      })),
    }),
  );
}

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
    if (mode === 'report') {
      const loaded = await loadSiteHistory(
        result.payload.audit.site.id,
        result.payload.audit.site.hosting,
      );
      if (!cancelled) {
        history = loaded;
        historyReady = true;
      }
    }
  }
});
</script>

{#if phase === 'loading' || (payload && (payload.audit.status === 'queued' || payload.audit.status === 'running'))}
  <div class="reading">
    <AuditOverlay
      message={progressLive(payload?.audit.status ?? 'queued', finishedNames)}
    />
  </div>
{:else if phase === 'message'}
  <h1>{mode === 'domain' ? t('domain.heading') : t('report.heading')}</h1>
  <p role="status">{message}</p>
  {#if payload}
    <p>
      <a class="link-action" href={`/progression?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.progress')}</a>
    </p>
  {:else}
    <p><a class="link-action" href="/sites">{t('nav.sites')}</a></p>
  {/if}
{:else if payload}
  <div class="reading">
    {#if mode === 'domain'}
      <section class="glass glass-module">
        <div class="glass-plate">
          <p><a class="link-action" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('report.back')}</a></p>
          <header class="verdict">
            <ScoreGauge domain={domainPlain(domainId)} score={domainScore} size="hero" />
            <div>
              <p class="kicker">{payload.audit.site.url}</p>
              <h1>{domainPlain(domainId)}</h1>
              <p class="detail">{domainSentence(domainId, levelForScore(domainScore))}</p>
              {#if domainUntested}
                <UntestedCause
                  coverageNote={domainUntested.coverageNote}
                  causes={domainUntested.causes}
                />
              {/if}
              {#if domainId === 'reputation' && aside?.rating !== null && aside}
                <p>{t('places.rating', { rating: formatRating(aside.rating) })}</p>
                <p>{t('places.count', { count: formatNumber(aside.reviewCount ?? 0) })}</p>
              {/if}
            </div>
          </header>
        </div>
      </section>
    {:else}
      <section class="glass glass-module">
        <div class="glass-plate">
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
                    <li><a class="link-inline" href={`#finding-${item.id}`}>{item.title}</a></li>
                  {/each}
                </ol>
              {/if}
            </div>
          </header>
        </div>
      </section>
      <section class="glass glass-module">
        <div class="glass-plate">
          <h2>{t('section.categories')}</h2>
          <CategoryList {items} />
        </div>
      </section>
      {#if aside}
        <section class="glass glass-module">
          <div class="glass-plate">
            <h2>{t('places.aside.title')}</h2>
            <p class="hint">{t('places.aside.note')}</p>
            <ScoreGauge domain={t('domain.reputation.plain')} score={aside.score} />
            {#if aside.name}
              <p>{aside.name}</p>
            {/if}
            {#if aside.rating !== null}
              <p>{t('places.rating', { rating: formatRating(aside.rating) })}</p>
              <p>{t('places.count', { count: formatNumber(aside.reviewCount ?? 0) })}</p>
            {/if}
            <p>{domainSentence('reputation', aside.level)}</p>
            {#if aside.score === null}
              <p><a class="link-action" href="/sites">{t('places.choose')}</a></p>
            {/if}
          </div>
        </section>
      {/if}
    {/if}

    <section class="glass glass-module">
      <div class="glass-plate">
        <h2 id="corrections">{t('section.findings')}</h2>
        {#if mode === 'report'}
          <FindingList
            findings={reportRows(payload, fixesFor(hostingOf(payload.audit.site.hosting)))}
            brief={{
              url: payload.audit.site.url,
              at: stamp,
              stack: recognizedStack(payload.findings),
            }}
          />
        {:else}
          <FindingList findings={shown} />
        {/if}
      </div>
    </section>

    {#if mode === 'report' && historyReady}
      <section class="glass glass-module">
        <div class="glass-plate">
          <h2>{t('section.table')}</h2>
          {#if history && history.points.length > 0}
            <HistoryPanel
              series={history.series}
              points={history.points}
              audits={history.snapshots}
              initialSeries={[GLOBAL_SERIES]}
            />
          {:else}
            <EmptyState message={t('history.summary.empty')}>
              <p>
                <a class="link-action" href={relaunchHref(payload.audit.site.id)}>{t('sites.audit')}</a>
              </p>
            </EmptyState>
          {/if}
        </div>
      </section>
    {/if}

    <section class="glass glass-module">
      <div class="glass-plate">
        <p class="no-print export-links">
          <a class="link-action" href={relaunchHref(payload.audit.site.id)}>{t('progress.retry')}</a>
          <a class="link-action" href={`/rapport/${payload.audit.id}/imprimer`}>{t('print.link')}</a>
          <a
            class="link-action"
            href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}
            download={markdownFilename(payload.audit.site.url, stamp)}
            onclick={downloadMarkdown}
          >{t('export.markdown')}</a>
        </p>
        <h2 id="verification">{t('section.verify')}</h2>
        <details>
          <summary>{t('verify.how')}</summary>
          <p class="prose">{t('verify.lead')}</p>
          <p class="prose">{t('verify.pending')}</p>
          <p class="prose">{t('verify.id')}</p>
        </details>
        <PreuveMentions />
      </div>
    </section>
    <section class="glass glass-module">
      <div class="glass-plate">
        <ReportFooter
          url={payload.audit.site.url}
          at={stamp}
          methodVersion={payload.audit.methodVersion}
          fingerprint={payload.audit.id}
          fingerprintKind="id"
          verifyHref={`/verifier/${payload.audit.id}`}
        />
      </div>
    </section>
  </div>
{/if}

<style>
  .verdict {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-6) var(--space-7);
    align-items: center;
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

  .export-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  @media (max-width: 768px) {
    .verdict {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
