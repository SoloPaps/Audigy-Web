<script lang="ts">
import { type MessageKey, t } from '../i18n/index.js';
import {
  countByFilter,
  type FilterId,
  type Finding,
  filterFindings,
  levelForStatus,
} from '../lib/findings.js';
import StatusMark from './StatusMark.svelte';

interface Props {
  findings: Finding[];
}

let { findings }: Props = $props();
let filter = $state<FilterId>('all');
let copiedId = $state<string | null>(null);

const counts = $derived(countByFilter(findings));
const visible = $derived(filterFindings(findings, filter));

const filters: { id: FilterId; label: MessageKey }[] = [
  { id: 'all', label: 'filter.all' },
  { id: 'fail', label: 'filter.fail' },
  { id: 'warn', label: 'filter.warn' },
  { id: 'pass', label: 'filter.pass' },
];

async function copyCode(finding: Finding): Promise<void> {
  if (!finding.code) return;
  try {
    await navigator.clipboard.writeText(finding.code);
    copiedId = finding.id;
  } catch {
    copiedId = null;
  }
}

function choose(id: FilterId): void {
  filter = id;
  copiedId = null;
}
</script>

<div class="filters" role="group" aria-labelledby="filtre-legend">
  <p id="filtre-legend" class="visually-hidden">{t('filter.legend')}</p>
  {#each filters as item (item.id)}
    <button
      type="button"
      class="filter"
      aria-pressed={filter === item.id}
      onclick={() => choose(item.id)}
    >
      {t(item.label)}
      <span class="count">{counts[item.id]}</span>
    </button>
  {/each}
</div>
<p class="visually-hidden" aria-live="polite">{t('filter.shown', { count: visible.length })}</p>
{#if visible.length === 0}
  <p>{t('filter.empty')}</p>
{/if}
<div class="findings">
  {#each visible as finding (finding.id)}
    <article class="finding">
      <div class="finding-top">
        <StatusMark level={levelForStatus(finding.status)} />
        <p class="effort">{finding.effort}</p>
      </div>
      <h3>{finding.title}</h3>
      <p class="why"><span class="why-label">{t('finding.why')}</span> {finding.why}</p>
      <details>
        <summary>{t('finding.fix')}</summary>
        <ol>
          {#each finding.steps as step, index (`${finding.id}-${index}`)}
            <li>{step}</li>
          {/each}
        </ol>
        {#if finding.code}
          <pre><code>{finding.code}</code></pre>
          <button type="button" class="button button-secondary" onclick={() => copyCode(finding)}>
            {copiedId === finding.id ? t('finding.copied') : t('finding.copy')}
          </button>
        {/if}
        {#if finding.sourceHref && finding.sourceLabel}
          <p><a href={finding.sourceHref}>{finding.sourceLabel}</a></p>
        {/if}
      </details>
    </article>
  {/each}
</div>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .filter {
    min-height: var(--touch-min);
    padding-inline: var(--space-4);
    border: var(--border) solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font: 600 var(--text-sm) / var(--leading-title) var(--font-text);
    cursor: pointer;
  }

  .filter[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .finding {
    padding-block: var(--space-4);
    border-top: var(--border) solid var(--line);
  }

  .finding-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .effort {
    margin: 0;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }

  .why-label {
    font-weight: 600;
  }

  summary {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-min);
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
  }

  ol {
    margin: var(--space-3) 0;
    padding-inline-start: var(--space-5);
  }

  li + li {
    margin-top: var(--space-2);
  }

  pre {
    max-width: 100%;
    margin: 0 0 var(--space-3);
    padding: var(--space-4);
    overflow-x: auto;
    border: var(--border) solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
