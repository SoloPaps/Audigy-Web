<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { storedSessionPresent } from '../lib/auth-storage.js';

interface Props {
  pathname: string;
}

let { pathname }: Props = $props();
let loggedIn = $state(false);
let open = $state(false);
let menuButton = $state<HTMLButtonElement | null>(null);

function normalize(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

const here = $derived(normalize(pathname));

function current(href: string): 'page' | undefined {
  return here === href ? 'page' : undefined;
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !open) return;
  open = false;
  menuButton?.focus();
}

onMount(() => {
  window.addEventListener('keydown', onKey);
  loggedIn = storedSessionPresent();
  return () => window.removeEventListener('keydown', onKey);
});
</script>

<nav aria-label={t('nav.main')}>
  <button
    bind:this={menuButton}
    class="button menu-button link-nav"
    type="button"
    aria-expanded={open}
    aria-controls="nav-panel"
    onclick={() => { open = !open; }}
  >
    {t('nav.menu')}
  </button>
  <div id="nav-panel" class:open>
    <a class="link-nav" href="/methode" aria-current={current('/methode')}>{t('nav.method')}</a>
    {#if loggedIn}
      <a class="link-nav" href="/sites" aria-current={current('/sites')}>{t('nav.sites')}</a>
      <a class="link-nav" href="/compte" aria-current={current('/compte')}>{t('nav.account')}</a>
    {:else}
      <a class="link-nav" href="/connexion" aria-current={current('/connexion')}>{t('nav.login')}</a>
    {/if}
  </div>
</nav>

<style>
  nav { position: relative; flex-shrink: 0; }
  #nav-panel { display: flex; flex-wrap: wrap; gap: var(--space-4); }
  .menu-button { display: none; white-space: nowrap; overflow-wrap: normal; }
  @media (max-width: 768px) {
    .menu-button { display: inline-flex; }
    #nav-panel { display: none; }
    #nav-panel.open {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      min-width: 12rem;
      padding: var(--space-4);
      background: var(--plate);
      border: var(--border) solid var(--glass-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-float);
    }
  }
</style>
