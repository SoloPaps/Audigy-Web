<script lang="ts">
import { type Level, levelLabel } from '../lib/score.js';

interface Props {
  level: Level;
}

let { level }: Props = $props();
</script>

<span class="status" data-level={level}>
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
    {#if level === 'good'}
      <circle cx="8" cy="8" r="5" fill="currentColor" />
    {:else if level === 'improve'}
      <path d="M8 2.5 L14 13.5 H2 Z" fill="currentColor" />
    {:else if level === 'problem'}
      <rect x="3" y="3" width="10" height="10" fill="currentColor" />
    {:else}
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />
    {/if}
  </svg>
  <span>{levelLabel(level)}</span>
</span>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--score-untested);
    font-weight: 600;
  }

  .status[data-level='good'] {
    color: var(--score-good);
  }

  .status[data-level='improve'] {
    color: var(--score-improve);
  }

  .status[data-level='problem'] {
    color: var(--score-problem);
  }

  svg {
    display: block;
    flex: none;
  }
</style>
