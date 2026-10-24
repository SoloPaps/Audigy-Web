<script lang="ts">
import { t } from '../i18n/index.js';
import type { UntestedCauses } from '../lib/categories.js';

interface Props {
  coverageNote?: string | null;
  causes?: UntestedCauses | null;
}

let { coverageNote = null, causes = null }: Props = $props();
</script>

{#if coverageNote || causes}
  <div class="domain-untested">
    {#if coverageNote}
      <p>{coverageNote}</p>
    {/if}
    {#if causes}
      {#if causes.primary}
        <p>
          {causes.primary.text}
          {#if causes.primary.searchConsole}
            <a class="link-action" href="/search-console">{t('domain.cause.gsc.link')}</a>
          {/if}
        </p>
      {/if}
      <p>{causes.closing}</p>
      {#if causes.others.length > 0}
        <details>
          <summary>{t('domain.cause.others')}</summary>
          <ul>
            {#each causes.others as line (line.text)}
              <li>
                {line.text}
                {#if line.searchConsole}
                  <a class="link-action" href="/search-console">{t('domain.cause.gsc.link')}</a>
                {/if}
              </li>
            {/each}
          </ul>
        </details>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .domain-untested {
    max-width: var(--line-length);
    margin-top: var(--space-2);
  }

  p,
  li {
    margin: 0 0 var(--space-2);
  }

  ul {
    margin: 0;
    padding-inline-start: var(--space-5);
  }
</style>
