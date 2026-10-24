<script lang="ts">
import { untrack } from 'svelte';
import type uPlot from 'uplot';
import { formatDate, t } from '../i18n/index.js';
import { levelForStatus } from '../lib/findings.js';
import {
  type AuditSnapshot,
  axisLabels,
  clampSeries,
  compareAudits,
  GLOBAL_SERIES,
  type HistoryPoint,
  type HistorySeries,
  historySummary,
  historyTable,
  MAX_SERIES,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_THRESHOLDS,
  seriesStyle,
  sortPoints,
  yRange,
} from '../lib/history.js';
import DataTable from './DataTable.svelte';
import StatusMark from './StatusMark.svelte';

interface Props {
  series: HistorySeries[];
  points: HistoryPoint[];
  audits: AuditSnapshot[];
  initialSeries?: string[];
}

interface Dot {
  key: string;
  href: string;
  label: string;
  x: number;
  y: number;
}

let {
  series,
  points,
  audits,
  initialSeries = [GLOBAL_SERIES],
}: Props = $props();

let selected = $state(untrack(() => clampSeries(initialSeries)));
let limit = $state(false);
let olderId = $state(untrack(() => audits[0]?.id ?? ''));
let newerId = $state(untrack(() => audits.at(-1)?.id ?? ''));
let tableOpen = $state(false);
let frame = $state<HTMLDivElement | null>(null);
let host = $state<HTMLDivElement | null>(null);
let dots = $state<Dot[]>([]);

const active = $derived(
  selected.flatMap((id) => {
    const item = series.find((seriesItem) => seriesItem.id === id);
    return item ? [item] : [];
  }),
);
const summary = $derived(
  historySummary(points, active[0]?.id ?? GLOBAL_SERIES),
);
const table = $derived(historyTable(points, active));
const older = $derived(audits.find((audit) => audit.id === olderId));
const newer = $derived(audits.find((audit) => audit.id === newerId));
const diff = $derived(
  older && newer && older.id !== newer.id ? compareAudits(older, newer) : null,
);

function toggle(id: string, want: boolean): void {
  if (want) {
    if (selected.includes(id)) return;
    if (selected.length >= MAX_SERIES) {
      limit = true;
      return;
    }
    limit = false;
    selected = [...selected, id];
    return;
  }
  if (selected.length <= 1) return;
  limit = false;
  selected = selected.filter((item) => item !== id);
}

function onCheck(id: string, node: EventTarget | null): void {
  if (!(node instanceof HTMLInputElement)) return;
  toggle(id, node.checked);
  node.checked = selected.includes(id);
}

function pin(node: HTMLElement, pos: { x: number; y: number }) {
  const apply = (value: { x: number; y: number }) => {
    node.style.left = `${value.x}px`;
    node.style.top = `${value.y}px`;
  };
  apply(pos);
  return { update: apply };
}

function token(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function paintBands(plot: uPlot): void {
  const [min, max] = yRange(0, 0);
  const bands = [
    { from: min, to: SCORE_THRESHOLDS[0], color: token('--score-problem-bg') },
    {
      from: SCORE_THRESHOLDS[0],
      to: SCORE_THRESHOLDS[1],
      color: token('--score-improve-bg'),
    },
    { from: SCORE_THRESHOLDS[1], to: max, color: token('--score-good-bg') },
  ];
  const ctx = plot.ctx;
  for (const band of bands) {
    if (!band.color) continue;
    const top = plot.valToPos(band.to, 'y', true);
    const bottom = plot.valToPos(band.from, 'y', true);
    ctx.fillStyle = band.color;
    ctx.fillRect(plot.bbox.left, top, plot.bbox.width, bottom - top);
  }
}

function placeDots(plot: uPlot, ids: readonly string[]): Dot[] {
  const node = host;
  const box = frame;
  const canvas = node?.querySelector('canvas');
  if (!node || !box || !canvas) return [];
  const origin = box.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const dx = rect.left - origin.left;
  const dy = rect.top - origin.top;
  const ordered = sortPoints(points);
  const next: Dot[] = [];
  const gap = 40;
  const mid = (ids.length - 1) / 2;
  for (const [seriesIndex, id] of ids.entries()) {
    const label = series.find((item) => item.id === id)?.label ?? id;
    for (const [index, point] of ordered.entries()) {
      const score = point.scores[id];
      if (typeof score !== 'number') continue;
      next.push({
        key: `${id}-${index}`,
        href: point.href,
        label: t('history.point', {
          series: label,
          score,
          date: formatDate(new Date(point.at)),
        }),
        x:
          dx +
          plot.valToPos(Date.parse(point.at) / 1000, 'x', true) +
          (seriesIndex - mid) * gap,
        y: dy + plot.valToPos(score, 'y', true),
      });
    }
  }
  return next;
}

$effect(() => {
  const ids = selected.filter((id) => series.some((item) => item.id === id));
  const node = host;
  const box = frame;
  const ordered = sortPoints(points);
  if (!node || !box || ids.length === 0 || ordered.length === 0) {
    dots = [];
    return;
  }
  let alive = true;
  let plot: uPlot | null = null;
  let lastWidth = 0;
  let lastHeight = 0;
  let ticket = 0;

  const draw = async (force: boolean) => {
    const width = Math.floor(node.clientWidth);
    const height = Math.floor(node.clientHeight);
    if (!alive || width < 2 || height < 2) return;
    if (!force && plot && width === lastWidth && height === lastHeight) return;
    const current = ++ticket;
    lastWidth = width;
    lastHeight = height;
    const { default: UPlot } = await import('uplot');
    if (!alive || current !== ticket) return;
    const ink = token('--ink');
    const line = token('--line');
    const paper = token('--paper');
    const font = getComputedStyle(document.body);
    const axisFont = `${font.fontSize} ${font.fontFamily}`;
    const strokes = [token('--ink'), token('--accent'), token('--ink-2')];
    const times = ordered.map((point) => Date.parse(point.at) / 1000);
    const [low, high] = yRange(
      Math.min(
        ...ordered.flatMap((point) =>
          Object.values(point.scores).filter(
            (score): score is number => typeof score === 'number',
          ),
        ),
      ),
      Math.max(
        ...ordered.flatMap((point) =>
          Object.values(point.scores).filter(
            (score): score is number => typeof score === 'number',
          ),
        ),
      ),
    );
    const options: uPlot.Options = {
      width,
      height,
      padding: [8, 12, 28, 40],
      legend: { show: false },
      cursor: { show: false },
      scales: { x: { time: true }, y: { range: [low, high] } },
      axes: [
        {
          stroke: ink,
          font: axisFont,
          grid: { show: false },
          ticks: { stroke: line },
          splits: times,
          values: (_self, splits) => axisLabels(splits),
        },
        {
          stroke: ink,
          font: axisFont,
          grid: { stroke: line },
          ticks: { stroke: line },
          splits: [SCORE_MIN, ...SCORE_THRESHOLDS, SCORE_MAX],
          values: (_self, splits) => splits.map((tick) => String(tick)),
        },
      ],
      series: [
        {},
        ...ids.map((id, index) => {
          const style = seriesStyle(index);
          const color = strokes[index] || ink;
          return {
            label: series.find((item) => item.id === id)?.label ?? id,
            stroke: color,
            width: 2,
            dash: [...style.dash],
            points: {
              show: true,
              size: 8,
              space: 0,
              width: 2,
              stroke: color,
              fill: paper,
            },
          };
        }),
      ],
      hooks: {
        drawClear: [(self) => paintBands(self)],
        draw: [
          (self) => {
            if (alive) dots = placeDots(self, ids);
          },
        ],
      },
    };
    plot?.destroy();
    plot = new UPlot(
      options,
      [
        times,
        ...ids.map((id) => ordered.map((point) => point.scores[id] ?? null)),
      ],
      node,
    );
    for (const canvas of node.querySelectorAll('canvas')) {
      canvas.setAttribute('aria-hidden', 'true');
    }
  };

  void draw(true);
  const observer = new ResizeObserver(() => {
    void draw(false);
  });
  observer.observe(node);
  const theme = new MutationObserver(() => {
    void draw(true);
  });
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onMedia = () => {
    void draw(true);
  };
  media.addEventListener('change', onMedia);

  return () => {
    alive = false;
    observer.disconnect();
    theme.disconnect();
    media.removeEventListener('change', onMedia);
    plot?.destroy();
  };
});
</script>

<p class="summary">{summary}</p>

{#if series.length > 0}
  <fieldset class="series">
    <legend>{t('history.series')}</legend>
    {#each series as item (item.id)}
      <label class="choice">
        <input
          type="checkbox"
          checked={selected.includes(item.id)}
          onchange={(event) => onCheck(item.id, event.currentTarget)}
        />
        <span>{item.label}</span>
      </label>
    {/each}
  </fieldset>
{/if}
{#if limit}
  <p role="status">{t('history.series.limit')}</p>
{/if}

{#if points.length > 0}
  <div
    class="chart-frame"
    bind:this={frame}
    role="group"
    aria-label={t('history.chart')}
    data-ymin={SCORE_MIN}
    data-ymax={SCORE_MAX}
    data-thresholds={SCORE_THRESHOLDS.join(' ')}
  >
    <p class="axis-note">{t('history.axis')} {t('history.thresholds')}</p>
    <div class="canvas-host" bind:this={host}></div>
    {#each dots as dot (dot.key)}
      <a class="point" href={dot.href} use:pin={{ x: dot.x, y: dot.y }}>
        <span class="visually-hidden">{dot.label}</span>
      </a>
    {/each}
    <ul class="legend">
      {#each active as item, index (item.id)}
        <li>
          <span
            class="swatch"
            data-stroke={seriesStyle(index).stroke}
            data-series={String(index)}
          ></span>
          <span>{item.label}</span>
        </li>
      {/each}
    </ul>
    <div aria-hidden="true">
      {#each points as point (point.id)}
        <span id={`audit-${point.id}`}></span>
      {/each}
    </div>
  </div>
{/if}

<button
  class="button button-secondary table-toggle"
  type="button"
  aria-expanded={tableOpen}
  aria-controls="history-table"
  onclick={() => {
    tableOpen = !tableOpen;
  }}
>
  {t('history.table.show')}
</button>
<div id="history-table" hidden={!tableOpen}>
  <DataTable caption={table.caption} columns={table.columns} rows={table.rows} />
</div>

<section class="compare" aria-label={t('compare.title')}>
  <h3>{t('compare.title')}</h3>
  {#if audits.length < 2}
    <p>{t('compare.need')}</p>
  {:else}
    <div class="pair">
      <div>
        <label for="history-older">{t('compare.older')}</label>
        <select id="history-older" bind:value={olderId}>
          {#each audits as audit (audit.id)}
            <option value={audit.id}>{audit.label}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="history-newer">{t('compare.newer')}</label>
        <select id="history-newer" bind:value={newerId}>
          {#each audits as audit (audit.id)}
            <option value={audit.id}>{audit.label}</option>
          {/each}
        </select>
      </div>
    </div>
    {#if diff}
      <h4>{t('compare.new')}</h4>
      {#if diff.added.length === 0}
        <p>{t('compare.new.empty')}</p>
      {:else}
        <ul class="issues">
          {#each diff.added as item (item.id)}
            <li>
              <a href={item.href}>{item.title}</a>
              <StatusMark level={levelForStatus(item.status)} />
            </li>
          {/each}
        </ul>
      {/if}
      <h4>{t('compare.fixed')}</h4>
      {#if diff.fixed.length === 0}
        <p>{t('compare.fixed.empty')}</p>
      {:else}
        <ul class="issues">
          {#each diff.fixed as item (item.id)}
            <li>
              <a href={item.href}>{item.title}</a>
              <StatusMark level={levelForStatus(item.status)} />
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p>{t('compare.same')}</p>
    {/if}
  {/if}
</section>

<style>
  .summary {
    font-weight: 600;
  }

  .series {
    margin: 0 0 var(--space-4);
    padding: 0;
    border: 0;
  }

  .series legend {
    margin-bottom: var(--space-2);
    font-weight: 600;
  }

  .choice {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    min-height: var(--touch-min);
  }

  .axis-note {
    color: var(--ink-2);
    font-size: var(--text-sm);
  }

  .chart-frame {
    position: relative;
    max-width: 100%;
    padding: var(--space-6);
    overflow: clip;
  }

  .canvas-host {
    position: relative;
    width: 100%;
    height: 16rem;
  }

  .canvas-host :global(.uplot),
  .canvas-host :global(.uplot *),
  .canvas-host :global(.uplot *::before),
  .canvas-host :global(.uplot *::after) {
    box-sizing: border-box;
  }

  .canvas-host :global(.uplot) {
    font-family: var(--font-text);
    line-height: var(--leading-body);
    max-width: 100%;
  }

  .canvas-host :global(.u-wrap) {
    position: relative;
  }

  .canvas-host :global(.u-over),
  .canvas-host :global(.u-under) {
    position: absolute;
  }

  .canvas-host :global(.u-under) {
    overflow: hidden;
  }

  .canvas-host :global(canvas) {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
  }

  .canvas-host :global(.u-axis) {
    position: absolute;
  }

  .canvas-host :global(.u-cursor-x),
  .canvas-host :global(.u-cursor-y),
  .canvas-host :global(.u-select) {
    display: none;
  }

  .point {
    position: absolute;
    z-index: 1;
    width: var(--touch-min);
    height: var(--touch-min);
    translate: -50% -50%;
    border-radius: var(--radius-pill);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-5);
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  .legend li {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .swatch {
    display: inline-block;
    width: var(--space-6);
    height: 0;
    border-top-width: var(--focus-width);
    border-top-color: var(--ink);
  }

  .swatch[data-stroke='solid'] {
    border-top-style: solid;
  }

  .swatch[data-stroke='dashed'] {
    border-top-style: dashed;
  }

  .swatch[data-stroke='dotted'] {
    border-top-style: dotted;
  }

  .swatch[data-series='1'] {
    border-top-color: var(--accent);
  }

  .swatch[data-series='2'] {
    border-top-color: var(--ink-2);
  }

  .table-toggle {
    margin-top: var(--space-4);
  }

  .pair {
    display: grid;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: 600;
  }

  select {
    width: 100%;
    min-height: var(--touch-min);
    padding-inline: var(--space-3);
    border: var(--border) solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font: 400 var(--text-md) / var(--leading-body) var(--font-text);
  }

  .issues {
    margin: 0 0 var(--space-4);
    padding: 0;
    list-style: none;
  }

  .issues li {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    align-items: center;
    padding-block: var(--space-2);
    border-bottom: var(--border) solid var(--line);
  }

  @media (min-width: 768px) {
    .pair {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
</style>
