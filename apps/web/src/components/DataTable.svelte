<script lang="ts">
import type { Level } from '../lib/score.js';
import StatusMark from './StatusMark.svelte';

interface Column {
  key: string;
  label: string;
}

interface Cell {
  text: string;
  level?: Level;
  numeric?: boolean;
}

interface Props {
  caption: string;
  summary?: string;
  columns: Column[];
  rows: Cell[][];
}

let { caption, summary, columns, rows }: Props = $props();
</script>

{#if summary}
  <p class="prose summary">{summary}</p>
{/if}
<div class="table-wrap">
  <table class="data-table">
    <caption>{caption}</caption>
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th scope="col">{column.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, index (index)}
        <tr>
          {#each row as cell, cellIndex (`${index}-${cellIndex}`)}
            <td class:numeric={cell.numeric}>
              <span class="cell">
                {#if cell.text !== ''}
                  <span>{cell.text}</span>
                {/if}
                {#if cell.level}
                  <StatusMark level={cell.level} />
                {/if}
              </span>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .summary {
    font-weight: 600;
  }

  .table-wrap {
    max-width: 100%;
  }

  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .cell {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  caption {
    margin-bottom: var(--space-3);
    text-align: start;
    font-weight: 600;
  }

  th,
  td {
    padding: var(--space-2) var(--space-3);
    border-bottom: var(--border) solid var(--line);
    text-align: start;
    vertical-align: top;
  }

  th {
    font-weight: 600;
  }

  .numeric {
    font-variant-numeric: tabular-nums;
  }
</style>
