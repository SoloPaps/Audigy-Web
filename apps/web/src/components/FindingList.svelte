<script lang="ts">
import { tick } from 'svelte';
import { t as briefT } from '../i18n/brief-fr.js';
import { t } from '../i18n/index.js';
import {
  type BriefDocument,
  type BriefFinding,
  renderBrief,
  type TerminalMode,
} from '../lib/brief.js';
import {
  barState,
  failsOf,
  generatedLive,
  selectionLabel,
} from '../lib/brief-bar.js';
import {
  briefFileBody,
  briefFilename,
  downloadTextFile,
} from '../lib/brief-file.js';
import {
  type Finding,
  groupFindings,
  levelForStatus,
} from '../lib/findings.js';
import { methodeCatalog } from '../lib/methode-load.js';
import type { ReportRow } from '../lib/report-model.js';
import EmptyState from './EmptyState.svelte';
import StatusMark from './StatusMark.svelte';

interface BriefContext {
  url: string;
  at: Date | null;
  stack: string | null;
}

interface Props {
  findings: Finding[] | ReportRow[];
  brief?: BriefContext | null;
}

type FilterId = 'all' | 'fail' | 'warn' | 'pass';

let { findings, brief = null }: Props = $props();
let copiedId = $state<string | null>(null);
let filter = $state<FilterId>('all');
let checked = $state<Record<string, boolean>>({});
let terminal = $state<Record<string, TerminalMode>>({});
let briefText = $state<string | null>(null);
let panelOpen = $state(false);
let toast = $state('');
let live = $state('');

function asRow(item: Finding | ReportRow): ReportRow {
  if ('catalogStatus' in item) return item;
  return {
    ...item,
    checkId: item.id,
    catalogStatus: item.status,
    proof: item.why,
    impactText: item.limit?.trim() ? item.limit : null,
    sources: [],
  };
}

const briefRows = $derived(findings.map(asRow));
const countsBrief = $derived({
  failCount: briefRows.filter((row) => row.catalogStatus === 'fail').length,
  warnCount: briefRows.filter((row) => row.catalogStatus === 'warn').length,
  passCount: briefRows.filter((row) => row.catalogStatus === 'pass').length,
  selectedCount: briefRows.filter((row) => checked[row.id]).length,
});
const bar = $derived(brief ? barState(countsBrief) : null);

function modeOf(id: string): TerminalMode {
  return terminal[id] ?? 'rien';
}

function toBriefFinding(row: ReportRow, mode: TerminalMode): BriefFinding {
  return {
    id: row.id,
    checkId: row.checkId,
    title: row.title,
    statusLabel: t(
      row.catalogStatus === 'warn' ? 'status.warn' : 'status.fail',
    ),
    proof: row.proof,
    impact: row.impactText,
    terminal: mode,
  };
}

function auditAt(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function documentFrom(
  items: readonly ReportRow[],
  includeTerminal: boolean,
): BriefDocument {
  const sources = new Map(items.map((row) => [row.checkId, row.sources]));
  return {
    url: brief?.url ?? '',
    at: auditAt(brief?.at),
    stack: brief?.stack ?? null,
    findings: items.map((row) =>
      toBriefFinding(row, includeTerminal ? modeOf(row.id) : 'rien'),
    ),
    catalog: methodeCatalog(),
    sources,
    includeTerminal,
  };
}

function ordered(ids: readonly string[]): ReportRow[] {
  const wanted = new Set(ids);
  const grouped = groupFindings(briefRows);
  const warn = grouped.next.filter(
    (row) => asRow(row).catalogStatus === 'warn',
  );
  return [...grouped.priority, ...warn]
    .map(asRow)
    .filter((row) => wanted.has(row.id));
}

async function publish(text: string, count: number): Promise<void> {
  briefText = text;
  panelOpen = true;
  live = '';
  await tick();
  live = generatedLive(count);
}

async function generate(): Promise<void> {
  const ids = briefRows.filter((row) => checked[row.id]).map((row) => row.id);
  const items = ordered(ids);
  if (items.length === 0 || !brief) return;
  await publish(renderBrief(documentFrom(items, true)), items.length);
}

async function allFails(mode: TerminalMode = 'rien'): Promise<void> {
  if (!brief) return;
  const ids = failsOf(briefRows);
  const items = ordered(ids);
  if (items.length === 0) return;
  const next: Record<string, boolean> = {};
  for (const id of ids) next[id] = true;
  checked = next;
  if (mode !== 'rien') {
    const modes = { ...terminal };
    for (const id of ids) modes[id] = mode;
    terminal = modes;
  }
  await publish(
    renderBrief(documentFrom(items, mode !== 'rien')),
    items.length,
  );
}

async function copyBrief(): Promise<void> {
  if (!briefText) return;
  try {
    await navigator.clipboard.writeText(briefText);
    toast = briefT('brief.copied');
  } catch {
    toast = briefT('brief.copyFail');
  }
}

function saveBrief(): void {
  if (!briefText || !brief) return;
  const at = auditAt(brief.at) ?? new Date();
  downloadTextFile(briefFilename(brief.url, at), briefFileBody(briefText));
}

const groups = $derived(groupFindings(findings));
const privacyUntested = $derived(
  findings.filter(
    (item) =>
      item.status === 'untested' &&
      asRow(item).checkId.startsWith('vie_privee.'),
  ),
);
const privacyIds = $derived(new Set(privacyUntested.map((item) => item.id)));
const nextShown = $derived(groups.next);
const otherUntested = $derived(
  groups.untested.filter((item) => !privacyIds.has(item.id)),
);
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
</script>

{#snippet rows(items: Finding[])}
  {#each items as finding (finding.id)}
    <article class="finding" id={`finding-${finding.id}`}>
      {#if brief && (asRow(finding).catalogStatus === 'fail' || asRow(finding).catalogStatus === 'warn')}
        <div class="brief-choice">
          <label>
            <input
              type="checkbox"
              bind:checked={
                () => checked[finding.id] ?? false,
                (value) => {
                  checked = { ...checked, [finding.id]: value };
                }
              }
            />
            <span class="mark mark-box" aria-hidden="true"></span>
            <span class="visually-hidden">{briefT('brief.include', { title: finding.title })}</span>
          </label>
          <div role="radiogroup" aria-label={briefT('brief.terminal.group', { title: finding.title })}>
            <label>
              <input type="radio" name={`terminal-${finding.id}`} value="rien" checked={modeOf(finding.id) === 'rien'} onclick={() => { terminal = { ...terminal, [finding.id]: 'rien' }; }} />
              <span class="mark mark-dot" aria-hidden="true"></span>
              <span aria-hidden="true">{briefT('brief.terminal.rien')}</span>
              <span class="visually-hidden">{briefT('brief.terminal.rien.long')}</span>
            </label>
            <label>
              <input type="radio" name={`terminal-${finding.id}`} value="verif" checked={modeOf(finding.id) === 'verif'} onclick={() => { terminal = { ...terminal, [finding.id]: 'verif' }; }} />
              <span class="mark mark-dot" aria-hidden="true"></span>
              <span aria-hidden="true">{briefT('brief.terminal.verif')}</span>
              <span class="visually-hidden">{briefT('brief.terminal.verif.long')}</span>
            </label>
            <label>
              <input type="radio" name={`terminal-${finding.id}`} value="fix" checked={modeOf(finding.id) === 'fix'} onclick={() => { terminal = { ...terminal, [finding.id]: 'fix' }; }} />
              <span class="mark mark-dot" aria-hidden="true"></span>
              <span aria-hidden="true">{briefT('brief.terminal.fix')}</span>
              <span class="visually-hidden">{briefT('brief.terminal.fix.long')}</span>
            </label>
          </div>
        </div>
      {:else if brief && (asRow(finding).catalogStatus === 'untested' || asRow(finding).catalogStatus === 'na')}
        <p class="hint">{briefT('brief.untested')}</p>
      {/if}
      <div class="finding-row">
        <StatusMark level={levelForStatus(finding.status)} />
        <div class="finding-copy">
          <h4>{finding.title}</h4>
          {#if finding.actionHref && finding.actionLabel}
            <p><a class="link-action" href={finding.actionHref}>{finding.actionLabel}</a></p>
          {/if}
        </div>
        <p class="effort">{finding.effort}</p>
      </div>
      {#if methodeCatalog().get(asRow(finding).checkId)?.href}
        <p>
          <a class="link-inline" href={methodeCatalog().get(asRow(finding).checkId)?.href}>{t('home.offer.link')}</a>
        </p>
      {/if}
      {#if finding.limit}
        <details class="finding-limit">
          <summary>{t('finding.limit')}</summary>
          <p>{finding.limit}</p>
        </details>
      {/if}
      <details class="finding-detail">
        <summary>{t('finding.fix')}</summary>
        {#if finding.why !== finding.title}
          <p class="why">{finding.why}</p>
        {/if}
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
    {#if nextShown.length > 0}
      <section class="group">
        <h3>{t('group.next')}</h3>
        <div class="stagger">
          {@render rows(nextShown)}
        </div>
      </section>
    {/if}
  {/if}
  {#if filter === 'all' && privacyUntested.length > 0}
    <section class="group">
      <h3>{t('domain.vie_privee.plain')}</h3>
      <div class="stagger">
        {@render rows(privacyUntested)}
      </div>
    </section>
  {/if}
  {#if filter === 'all' && otherUntested.length > 0}
    <section class="group">
      <h3>{t('status.untested')}</h3>
      <div class="stagger">
        {@render rows(otherUntested)}
      </div>
    </section>
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

{#if brief && bar?.allClear}
  <p class="hint">{briefT('brief.none')}</p>
{/if}
{#if brief && bar?.visible}
  <div class="brief-bar">
    <p>{selectionLabel(countsBrief.selectedCount)}</p>
    <button
      type="button"
      class="button button-secondary"
      disabled={!bar.failsEnabled}
      onclick={() => allFails('rien')}
    >{briefT('brief.allFails')}</button>
    <button
      type="button"
      class="button button-secondary"
      disabled={!bar.failsEnabled}
      onclick={() => allFails('verif')}
    >{briefT('brief.allVerif')}</button>
    <button
      type="button"
      class="button button-secondary"
      disabled={!bar.failsEnabled}
      onclick={() => allFails('fix')}
    >{briefT('brief.allFix')}</button>
    <button
      type="button"
      class={panelOpen && briefText ? 'button button-secondary' : 'button button-primary'}
      disabled={!bar.generateEnabled}
      onclick={generate}
    >{briefT('brief.generate')}</button>
    {#if bar.hint}
      <p class="hint">{briefT('brief.generate.hint')}</p>
    {/if}
  </div>
{/if}
{#if brief && panelOpen && briefText}
  <section class="brief-panel">
    <p role="status">{live}</p>
    <textarea class="brief-text" rows="14" readonly aria-label={briefT('brief.panel')} value={briefText}></textarea>
    <button type="button" class="button button-primary" onclick={copyBrief}>{briefT('brief.copy')}</button>
    <button type="button" class="button button-secondary" onclick={generate}>{briefT('brief.regenerate')}</button>
    <button type="button" class="link-action" onclick={saveBrief}>{briefT('brief.download')}</button>
    <button type="button" class="button button-secondary" onclick={() => { panelOpen = false; }}>{briefT('brief.collapse')}</button>
    {#if toast}
      <p class="hint" role="status">{toast}</p>
    {/if}
  </section>
{:else if brief && briefText}
  <button type="button" class="button button-secondary" onclick={() => { panelOpen = true; }}>{briefT('brief.show')}</button>
{/if}

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

  .brief-bar,
  .brief-panel,
  .brief-choice {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    max-width: 100%;
  }

  .brief-choice label {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    max-width: 100%;
    min-width: var(--touch-min);
    min-height: var(--touch-min);
    padding-inline: var(--space-2);
  }

  .brief-choice [role='radiogroup'] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    max-width: 100%;
  }

  @media print {
    :global(details.finding-detail::details-content) {
      content-visibility: visible;
      display: block;
    }

    :global(details.finding-detail:not([open]) > :not(summary)) {
      display: block;
    }
  }

  .brief-panel {
    margin-top: var(--space-4);
  }

  .brief-text {
    width: 100%;
    overflow: auto;
    resize: vertical;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: var(--leading-body);
    color: var(--ink);
    background: var(--surface);
    border: var(--border) solid var(--line);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }

  .brief-choice input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
  }

  .brief-choice .mark {
    box-sizing: border-box;
    width: 1.25rem;
    height: 1.25rem;
    border: var(--border) solid var(--ink);
    background: var(--paper);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    pointer-events: none;
  }

  .brief-choice .mark-box {
    border-radius: var(--radius-sm);
  }

  .brief-choice .mark-dot {
    border-radius: var(--radius-pill);
  }

  .brief-choice input:checked + .mark-box {
    background: var(--accent);
    border-color: var(--accent);
  }

  .brief-choice input:checked + .mark-box::after {
    content: '';
    width: 0.3rem;
    height: 0.55rem;
    margin-top: -0.125rem;
    border: solid var(--on-accent);
    border-width: 0 0.125rem 0.125rem 0;
    transform: rotate(40deg);
  }

  .brief-choice input:checked + .mark-dot::after {
    content: '';
    width: 0.625rem;
    height: 0.625rem;
    border-radius: var(--radius-pill);
    background: var(--accent);
  }

  .brief-choice input:focus-visible + .mark {
    outline: var(--focus-width) solid var(--focus);
    outline-offset: var(--focus-width);
  }

  @media (max-width: 320px) {
    .brief-bar,
    .brief-panel,
    .brief-choice {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
