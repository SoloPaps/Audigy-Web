<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { createAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import { InvalidSiteUrl, normalizeSiteUrl } from '../lib/site-url.js';

let message = $state(t('launch.working'));
let failed = $state(false);

onMount(async () => {
  const params = new URLSearchParams(location.search);
  const url = params.get('url');
  const siteId = params.get('site');
  if (!url && !siteId) {
    message = t('launch.missing');
    failed = true;
    return;
  }
  if (url && !siteId) {
    try {
      normalizeSiteUrl(url);
    } catch (error) {
      if (error instanceof InvalidSiteUrl) {
        message = t('api.error.invalid_url');
        failed = true;
        return;
      }
      throw error;
    }
  }
  const session = await currentSession();
  if (!session) {
    location.replace(loginHref(`${location.pathname}${location.search}`));
    return;
  }
  const result = await createAudit(
    session.access_token,
    siteId ? { siteId } : { url: url ?? '' },
  );
  if (!result.ok) {
    message = result.message;
    failed = true;
    return;
  }
  location.replace(`/progression?id=${encodeURIComponent(result.auditId)}`);
});
</script>

<p role="status" aria-live="polite">{message}</p>
{#if failed}
  <p class="page-links">
    <a class="link-action" href="/">{t('launch.back')}</a>
    <a class="link-action" href="/sites">{t('nav.sites')}</a>
  </p>
{/if}
