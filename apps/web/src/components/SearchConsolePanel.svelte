<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import { authConfigured } from '../lib/public-config.js';

let loading = $state(true);
let configured = $state(false);
let needLogin = $state(false);
let connected = $state(false);
let notice = $state('');
let error = $state('');
let pending = $state(false);

async function load(): Promise<void> {
  const etat = new URLSearchParams(location.search).get('etat');
  if (etat === 'ok') notice = t('gsc.page.saved');
  if (etat === 'erreur') error = t('gsc.page.error');
  if (!authConfigured()) {
    loading = false;
    return;
  }
  configured = true;
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    needLogin = true;
    loading = false;
    return;
  }
  const { data, error: readError } = await supabase.rpc(
    'list_my_oauth_connections',
  );
  loading = false;
  if (readError) {
    error = t('gsc.page.error');
    return;
  }
  connected = (data ?? []).some((row) => row.provider === 'google');
}

onMount(() => {
  void load();
});

async function start(): Promise<void> {
  error = '';
  const session = await currentSession();
  if (!session) {
    location.assign(loginHref('/search-console'));
    return;
  }
  pending = true;
  try {
    const response = await fetch('/api/oauth/google/start', {
      method: 'post'.toUpperCase(),
      credentials: 'include',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        accept: 'application/json',
      },
    });
    const body = (await response.json()) as { authorizeUrl?: unknown };
    if (
      response.ok &&
      typeof body.authorizeUrl === 'string' &&
      body.authorizeUrl.startsWith('https://accounts.google.com/')
    ) {
      location.assign(body.authorizeUrl);
      return;
    }
    error = t('gsc.page.error');
  } catch {
    error = t('gsc.page.error');
  }
  pending = false;
}

async function revoke(): Promise<void> {
  error = '';
  const session = await currentSession();
  if (!session) {
    location.assign(loginHref('/search-console'));
    return;
  }
  pending = true;
  try {
    const response = await fetch('/api/oauth/google/revoke', {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${session.access_token}`,
        accept: 'application/json',
      },
    });
    if (!response.ok) {
      error = t('gsc.page.error');
      pending = false;
      return;
    }
    connected = false;
    notice = t('gsc.page.revoked');
  } catch {
    error = t('gsc.page.error');
  }
  pending = false;
}
</script>

{#if loading}
  <p role="status">{t('gsc.page.loading')}</p>
{:else if !configured}
  <p>{t('gsc.page.missing')}</p>
  <p><a class="link-action" href={loginHref('/search-console')}>{t('gsc.connect')}</a></p>
{:else if needLogin}
  <p>{t('gsc.page.need_login')}</p>
  <p><a class="link-action" href={loginHref('/search-console')}>{t('gsc.connect')}</a></p>
{:else}
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
  {#if connected}
    <p>{t('gsc.page.connected')}</p>
    <button type="button" class="button button-secondary" onclick={revoke} disabled={pending}>
      {pending ? t('gsc.page.revoking') : t('gsc.page.revoke')}
    </button>
  {:else}
    <button type="button" class="button button-primary" onclick={start} disabled={pending}>
      {t('gsc.connect')}
    </button>
  {/if}
{/if}
