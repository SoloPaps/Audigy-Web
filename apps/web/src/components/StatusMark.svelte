<script lang="ts">
import { type Level, levelLabel } from '../lib/score.js';

interface Props {
  level: Level;
}

let { level }: Props = $props();
</script>

<span class="status" data-level={level}>
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {#if level === 'good'}
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    {:else if level === 'improve'}
      <path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    {:else if level === 'problem'}
      <rect x="3" y="3" width="18" height="18" rx="2" />
    {:else}
      <circle cx="12" cy="12" r="10" stroke-dasharray="3.2 3.2" />
    {/if}
  </svg>
  <span>{levelLabel(level)}</span>
</span>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    color: var(--score-untested);
    font-weight: 600;
    line-height: var(--leading-title);
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
    width: var(--icon-size);
    height: var(--icon-size);
    overflow: visible;
  }
</style>
