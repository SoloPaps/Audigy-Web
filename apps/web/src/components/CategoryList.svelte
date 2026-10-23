<script lang="ts">
import { t } from '../i18n/index.js';
import type { CategoryItem } from '../lib/categories.js';
import { gaugeLabel, levelForScore } from '../lib/score.js';
import StatusMark from './StatusMark.svelte';

interface Props {
  items: CategoryItem[];
}

let { items }: Props = $props();
</script>

<ul class="plain-list">
  {#each items as item (item.id)}
    {@const level = levelForScore(item.score)}
    <li class="category">
      <span class="category-name">{item.label}</span>
      <span class="category-meta">
        <span class="category-score">{item.score === null ? t('score.empty') : item.score}</span>
        <StatusMark {level} />
      </span>
      <span class="bar" aria-hidden="true">
        <span
          class="bar-fill"
          data-level={level}
          style={`width: ${item.score ?? 0}%`}
        ></span>
      </span>
      <span class="visually-hidden">{gaugeLabel(item.label, item.score)}</span>
    </li>
  {/each}
</ul>

<style>
  .category {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    padding-block: var(--space-3);
    border-bottom: var(--border) solid var(--line);
  }

  .category-name {
    font-weight: 600;
  }

  .category-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .category-score {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .bar {
    grid-column: 1 / -1;
    height: var(--space-2);
    background: var(--line);
    border-radius: var(--radius-sm);
  }

  .bar-fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-sm);
    background: var(--score-untested);
  }

  .bar-fill[data-level='good'] {
    background: var(--score-good);
  }

  .bar-fill[data-level='improve'] {
    background: var(--score-improve);
  }

  .bar-fill[data-level='problem'] {
    background: var(--score-problem);
  }
</style>
