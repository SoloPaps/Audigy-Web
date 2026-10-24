<script lang="ts">
import { t } from '../i18n/index.js';

interface Props {
  message: string;
}

let { message }: Props = $props();
</script>

<div class="overlay glass">
  <div class="glass-plate">
    <p role="status" aria-live="polite">{message}</p>
    <div class="disk"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <p><a class="link-action" href="/">{t('progress.home')}</a></p>
  </div>
</div>

<style>
  .disk,
  .bar {
    background: var(--line);
    border-radius: var(--radius-sm);
  }

  .disk {
    width: var(--gauge-hero);
    height: var(--gauge-hero);
    border-radius: 50%;
  }

  .bar {
    height: var(--space-4);
    margin-top: var(--space-3);
  }

  @media (prefers-reduced-motion: no-preference) {
    .bar { animation: pulse 1s linear infinite alternate; }
  }

  @keyframes pulse {
    from { opacity: 0.45; }
    to { opacity: 1; }
  }
</style>
