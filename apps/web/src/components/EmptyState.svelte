<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  message: string;
  title?: string;
  children?: Snippet;
}

let { message, title = '', children }: Props = $props();
</script>

<div class="empty glass glass-module">
  <div class="glass-plate">
    {#if title !== ''}
      <h1>{title}</h1>
    {/if}
    <p>{message}</p>
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  h1 {
    margin-bottom: var(--space-3);
  }

  p {
    max-width: var(--line-length);
    margin: 0;
  }
</style>
