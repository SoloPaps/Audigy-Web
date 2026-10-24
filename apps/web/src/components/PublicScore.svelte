<script lang="ts">
import { onMount } from 'svelte';
import { type MessageKey, t } from '../i18n/index.js';
import { browserClient } from '../lib/browser-session.js';
import type { CategoryItem } from '../lib/categories.js';
import {
  domainPlain,
  domainSentence,
  domainTech,
  REPORT_DOMAINS,
} from '../lib/domains.js';
import {
  loadPublicScore,
  loadSharedScore,
  type PublicScoreView,
  type SecurityDetail,
  scoreBadgeSvg,
} from '../lib/public-score.js';
import { type Level, levelForScore } from '../lib/score.js';
import { translate } from '../lib/translate.js';
import CategoryList from './CategoryList.svelte';
import PreuveMentions from './PreuveMentions.svelte';
import ReportFooter from './ReportFooter.svelte';
import ScoreGauge from './ScoreGauge.svelte';

interface Props {
  mode?: 'public' | 'share';
}

let { mode = 'public' }: Props = $props();

const HEAD: Record<Level, MessageKey> = {
  good: 'verdict.good',
  improve: 'verdict.improve',
  problem: 'verdict.problem',
  untested: 'verdict.untested',
};

let phase = $state<'loading' | 'missing' | 'ready'>('loading');
let failure = $state('');
let view = $state<PublicScoreView | null>(null);

const items = $derived(view ? categoryItems(view) : []);
const stamp = $derived.by(() => {
  const raw = view?.finishedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
});
const scored = $derived(
  items.filter(
    (item) =>
      (REPORT_DOMAINS as readonly string[]).includes(item.id) &&
      item.score !== null,
  ).length,
);

function categoryItems(score: PublicScoreView): CategoryItem[] {
  return score.domains.map((row) => {
    const level = levelForScore(row.score);
    return {
      id: row.domain,
      label: domainPlain(row.domain),
      technical: domainTech(row.domain),
      detail: domainSentence(row.domain, level),
      score: row.score,
    };
  });
}

function securityLine(detail: SecurityDetail): string {
  return translate(detail.messageKey) ?? t('score.security.generic');
}

function segment(): string {
  const parts = location.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[1] ?? '');
}

function download(): void {
  if (!view) return;
  const svg = scoreBadgeSvg(view.label, view.globalScore);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audigy-score.svg';
  link.click();
  URL.revokeObjectURL(url);
}

onMount(() => {
  void load();

  async function load(): Promise<void> {
    const key = segment();
    try {
      const row =
        mode === 'share'
          ? await loadSharedScore(browserClient(), key)
          : await loadPublicScore(browserClient(), key);
      view = row;
      phase = row ? 'ready' : 'missing';
    } catch {
      view = null;
      failure = t('score.public.error');
      phase = 'missing';
    }
  }
});
</script>

{#if phase === 'loading'}
  <h1>{t('meta.score.title')}</h1>
  <p role="status">{t('score.public.loading')}</p>
{:else if phase === 'missing' || !view}
  <h1>{mode === 'share' ? t('meta.share.title') : t('meta.score.title')}</h1>
  <p role="status">
    {failure ||
      (mode === 'share' ? t('share.missing') : t('score.public.missing'))}
  </p>
{:else}
  <header class="verdict">
    <ScoreGauge domain={t('domain.global')} score={view.globalScore} size="hero" />
    <div>
      <p class="kicker">{view.url}</p>
      <h1>{t(HEAD[levelForScore(view.globalScore)])}</h1>
      <p class="detail">{t('score.public.lead')}</p>
      <p class="hint">
        {t('report.coverage', { scored, total: REPORT_DOMAINS.length })}
      </p>
    </div>
  </header>

  {#if view.domains.length === 0}
    <p>{t('score.public.empty')}</p>
  {:else}
    <h2>{t('section.categories')}</h2>
    <CategoryList {items} />
  {/if}

  <h2>{t('score.security.title')}</h2>
  {#if view.securityDetails.length === 0}
    <p>{t('score.security.hidden')}</p>
  {:else}
    <ul class="steps">
      {#each view.securityDetails as detail (detail.checkId)}
        <li>{securityLine(detail)}</li>
      {/each}
    </ul>
  {/if}

  <p>
    <button type="button" class="button button-secondary" onclick={download}>
      {t('sites.badge')}
    </button>
  </p>
  <p class="hint">{t('sites.badge.hint')}</p>

  {#if stamp && view.methodVersion && view.auditId}
    <h2 id="verification">{t('section.verify')}</h2>
    <PreuveMentions />
    <ReportFooter
      url={view.url}
      at={stamp}
      methodVersion={view.methodVersion}
      fingerprint={view.auditId}
      fingerprintKind="id"
      verifyHref={`/verifier/${view.auditId}`}
    />
  {:else}
    <p>{t('score.public.empty')}</p>
  {/if}
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

  @media (max-width: 768px) {
    .verdict {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
