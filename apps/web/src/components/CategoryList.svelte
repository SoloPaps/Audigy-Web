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

<ul class="domains">
  {#each items as item (item.id)}
    {@const level = levelForScore(item.score)}
    <li class="domain">
      <div class="domain-copy">
        <p class="domain-title">
          {#if item.href}
            <a class="domain-plain" href={item.href}>{item.label}</a>
          {:else}
            <span class="domain-plain">{item.label}</span>
          {/if}
          <span class="domain-tech">{item.technical}</span>
        </p>
        <p class="domain-detail">{item.detail}</p>
      </div>
      <div class="domain-score">
        <span class="domain-num">{item.score === null ? t('score.empty') : item.score}</span>
        <StatusMark {level} />
      </div>
      <span class="visually-hidden">{gaugeLabel(item.label, item.score)}</span>
    </li>
  {/each}
</ul>

<style>
  .domains {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .domain {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3) var(--space-5);
    align-items: center;
    padding-block: var(--space-4);
    border-bottom: var(--border) solid var(--line);
  }

  .domain-title,
  .domain-detail {
    margin: 0;
  }

  .domain-title {
    line-height: var(--leading-title);
  }

  .domain-plain {
    font-weight: 600;
  }

  a.domain-plain {
    text-decoration-thickness: var(--border);
    text-underline-offset: 0.2em;
  }

  .domain-tech {
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-weight: 400;
  }

  .domain-tech::before {
    content: ' · ';
  }

  .domain-detail {
    margin-top: var(--space-1);
    max-width: var(--line-length);
  }

  .domain-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .domain-num {
    color: var(--ink);
    font-size: var(--text-xl);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    line-height: var(--leading-title);
  }

  @media (max-width: 768px) {
    .domain {
      grid-template-columns: minmax(0, 1fr);
    }

    .domain-score {
      flex-direction: row;
      align-items: center;
      gap: var(--space-3);
    }
  }
</style>
