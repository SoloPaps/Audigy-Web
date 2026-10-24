<script lang="ts">
import { t } from '../i18n/index.js';
import {
  type Finding,
  groupFindings,
  levelForStatus,
} from '../lib/findings.js';
import { correctionPrompt } from '../lib/report-export.js';
import EmptyState from './EmptyState.svelte';
import StatusMark from './StatusMark.svelte';

interface Props {
  findings: Finding[];
  url?: string;
}

type FilterId = 'all' | 'fail' | 'warn' | 'pass';
type CopyState = 'copied' | 'failed';

let { findings, url = '' }: Props = $props();
let copiedId = $state<string | null>(null);
let promptState = $state<Record<string, CopyState>>({});
let filter = $state<FilterId>('all');
const groups = $derived(groupFindings(findings));
const counts = $derived({
  all: findings.length,
  fail: groups.priority.length,
  warn: groups.next.length,
  pass: groups.good.length,
});
const filters: { id: FilterId; label: string }[] = [
  { id: 'all', label: t('report.filter.all') },
  { id: 'fail', label: t('report.filter.fail') },
  { id: 'warn', label: t('report.filter.warn') },
  { id: 'pass', label: t('report.filter.pass') },
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

function promptText(finding: Finding): string {
  return correctionPrompt({
    url,
    title: finding.title,
    statement: finding.why,
    limit: finding.limit ?? null,
    steps: finding.steps,
    code: finding.code,
  });
}

async function copyPrompt(finding: Finding): Promise<void> {
  try {
    await navigator.clipboard.writeText(promptText(finding));
    promptState = { ...promptState, [finding.id]: 'copied' };
  } catch {
    promptState = { ...promptState, [finding.id]: 'failed' };
  }
}
</script>

{#snippet rows(items: Finding[])}
  {#each items as finding (finding.id)}
    <article class="finding" id={`finding-${finding.id}`}>
      <div class="finding-row">
        <StatusMark level={levelForStatus(finding.status)} />
        <div class="finding-copy">
          <h4>{finding.title}</h4>
          {#if finding.why !== finding.title}
            <p class="why">{finding.why}</p>
          {/if}
          {#if finding.actionHref && finding.actionLabel}
            <p><a class="link-action" href={finding.actionHref}>{finding.actionLabel}</a></p>
          {/if}
        </div>
        <p class="effort">{finding.effort}</p>
      </div>
      {#if finding.limit}
        <details class="finding-limit">
          <summary>{t('finding.limit')}</summary>
          <p>{finding.limit}</p>
        </details>
      {/if}
      <details>
        <summary>{t('finding.fix')}</summary>
        <ol>
          {#each finding.steps as step, index (`${finding.id}-${index}`)}
            <li>{step}</li>
          {/each}
        </ol>
        <div class="prompt no-print">
          <textarea readonly rows="8" aria-label={t('prompt.label')}>{promptText(finding)}</textarea>
          <button type="button" class="button button-secondary" onclick={() => copyPrompt(finding)}>
            {t('prompt.copy')}
          </button>
          {#if promptState[finding.id] === 'copied'}
            <p role="status">{t('prompt.copied')}</p>
          {:else if promptState[finding.id] === 'failed'}
            <p role="status">{t('prompt.failed')}</p>
          {/if}
        </div>
        {#if finding.code}
          <pre><code>{finding.code}</code></pre>
          <button type="button" class="button button-secondary" onclick={() => copyCode(finding)}>
            {copiedId === finding.id ? t('finding.copied') : t('finding.copy')}
          </button>
        {/if}
        {#if finding.sourceHref && finding.sourceLabel}
          <p>
            <a class="link-inline" href={finding.sourceHref}>
              {finding.sourceLabel}
              <span class="visually-hidden">, {t('link.external')}</span>
            </a>
          </p>
        {/if}
      </details>
    </article>
  {/each}
{/snippet}

<div class="filters no-print" role="group" aria-label={t('report.filter.label')}>
  {#each filters as item (item.id)}
    <button
      type="button"
      class="filter"
      aria-pressed={filter === item.id}
      onclick={() => {
        filter = item.id;
      }}
    >
      {item.label}
      <span class="count">{counts[item.id]}</span>
    </button>
  {/each}
</div>

<div class="groups">
  {#if filter === 'all' || filter === 'fail'}
    {#if groups.priority.length > 0}
      <section class="group">
        <h3>{t('group.priority')}</h3>
        <div class="stagger">
          {@render rows(groups.priority)}
        </div>
      </section>
    {/if}
  {/if}
  {#if filter === 'all' || filter === 'warn'}
    {#if groups.next.length > 0}
      <section class="group">
        <h3>{t('group.next')}</h3>
        <div class="stagger">
          {@render rows(groups.next)}
        </div>
      </section>
    {/if}
  {/if}
  {#if filter === 'all' && groups.good.length > 0}
    <details class="good-group">
      <summary>
        <h3>{t('group.good')}</h3>
      </summary>
      <div class="stagger">
        {@render rows(groups.good)}
      </div>
    </details>
  {/if}
  {#if filter === 'pass' && groups.good.length > 0}
    <section class="group">
      <h3>{t('group.good')}</h3>
      {@render rows(groups.good)}
    </section>
  {/if}
  {#if counts[filter] === 0}
    <EmptyState message={t('report.filter.empty')} />
  {/if}
</div>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .filter {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch-min);
    padding-inline: var(--space-3);
    border: var(--border) solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font: 400 var(--text-sm) / var(--leading-title) var(--font-text);
    cursor: pointer;
  }

  .filter[aria-pressed='true'] {
    border-color: var(--ink);
    border-radius: var(--radius-pill);
    background: var(--surface);
    font-weight: 600;
  }

  .count {
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }

  .group + .group,
  .good-group {
    margin-top: var(--space-6);
  }

  h3 {
    margin-bottom: var(--space-2);
  }

  .good-group > summary {
    min-height: var(--touch-min);
    cursor: pointer;
  }

  .good-group > summary h3 {
    display: inline;
    margin: 0;
  }

  .finding {
    padding-block: var(--space-4);
    border-top: var(--border) solid var(--line);
  }

  .finding-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: start;
  }

  h4 {
    margin: 0 0 var(--space-1);
  }

  .why,
  .effort {
    margin: 0;
    color: var(--ink-2);
  }

  .effort {
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  summary {
    display: inline-flex;
    align-items: center;
    min-height: var(--touch-min);
    color: var(--accent);
    font-weight: 600;
    cursor: pointer;
  }

  .good-group > summary {
    display: list-item;
    color: var(--ink);
    font-weight: 400;
  }

  ol {
    margin: var(--space-3) 0;
    padding-inline-start: var(--space-5);
  }

  li + li {
    margin-top: var(--space-2);
  }

  pre,
  textarea {
    width: 100%;
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

  textarea {
    resize: vertical;
  }

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  details + details {
    margin-top: var(--space-2);
  }

  @media (max-width: 768px) {
    .finding-row {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .effort {
      grid-column: 2;
    }
  }
</style>
