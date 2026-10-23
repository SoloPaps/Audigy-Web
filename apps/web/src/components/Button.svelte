<script lang="ts">
import type { Snippet } from 'svelte';

type Variant = 'primary' | 'secondary' | 'link';

interface Props {
  href?: string;
  variant?: Variant;
  type?: 'button' | 'submit';
  children: Snippet;
}

let {
  href,
  variant = 'secondary',
  type = 'button',
  children,
}: Props = $props();
</script>

{#if href}
  <a class={`button button-${variant}`} {href}>{@render children()}</a>
{:else}
  <button class={`button button-${variant}`} {type}>{@render children()}</button>
{/if}
