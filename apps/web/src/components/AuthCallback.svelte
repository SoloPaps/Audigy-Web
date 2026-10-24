<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { currentSession } from '../lib/browser-session.js';
import { takeNext } from '../lib/nav.js';

let failed = $state(false);

onMount(async () => {
  const session = await currentSession();
  if (!session) {
    failed = true;
    return;
  }
  location.replace(takeNext('/sites'));
});
</script>

{#if failed}
  <p role="alert">{t('callback.failed')}</p>
  <p><a href="/connexion">{t('callback.retry')}</a></p>
{:else}
  <p role="status">{t('callback.working')}</p>
{/if}
