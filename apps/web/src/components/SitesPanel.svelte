<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import {
  browserClient,
  currentSession,
  signOut,
} from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import { InvalidSiteUrl, normalizeSiteUrl } from '../lib/site-url.js';

interface SiteRow {
  id: string;
  url: string;
  label: string;
  host: string;
}

let rows = $state<SiteRow[]>([]);
let loading = $state(true);
let needLogin = $state(false);
let error = $state('');
let notice = $state('');
let url = $state('');
let pending = $state(false);
let userId = '';

async function load(): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    loading = false;
    needLogin = true;
    return;
  }
  userId = session.user.id;
  const { data, error: readError } = await supabase
    .from('sites')
    .select('id, url, label, host')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('label', { ascending: true });
  loading = false;
  if (readError) {
    error = t('sites.error');
    return;
  }
  rows = (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    label: row.label,
    host: row.host,
  }));
}

onMount(() => {
  void load();
});

async function onSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  notice = '';
  if (pending) return;
  let draft: ReturnType<typeof normalizeSiteUrl>;
  try {
    draft = normalizeSiteUrl(url);
  } catch (caught) {
    if (caught instanceof InvalidSiteUrl) {
      error = t('api.error.invalid_url');
      return;
    }
    throw caught;
  }
  const supabase = browserClient();
  if (!supabase || userId === '') {
    location.assign(loginHref('/sites'));
    return;
  }
  pending = true;
  const { data, error: writeError } = await supabase
    .from('sites')
    .insert({
      owner_id: userId,
      url: draft.url,
      scope: draft.scope,
      host: draft.host,
      path_prefix: draft.pathPrefix,
      label: draft.label,
      hosting: draft.hosting,
    })
    .select('id, url, label, host')
    .single();
  pending = false;
  if (writeError || !data) {
    error =
      writeError?.code === '23505' ? t('sites.duplicate') : t('sites.error');
    return;
  }
  url = '';
  notice = t('sites.added');
  rows = [...rows, data].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

async function onSignOut(): Promise<void> {
  await signOut();
  location.assign('/');
}
</script>

{#if loading}
  <p role="status">{t('sites.loading')}</p>
{:else if needLogin}
  <p role="status">{t('sites.need_login')}</p>
  <p><a href={loginHref('/sites')}>{t('nav.login')}</a></p>
{:else}
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
  {#if rows.length === 0}
    <p>{t('sites.empty')}</p>
  {:else}
    <ul class="site-list">
      {#each rows as site (site.id)}
        <li class="site-row">
          <div>
            <p>{site.label}</p>
            <p class="kicker">{site.url}</p>
          </div>
          <div class="site-actions">
            <a href={`/lancer?site=${encodeURIComponent(site.id)}`}>
              {t('sites.audit')}
              <span class="visually-hidden">{site.label}</span>
            </a>
            <a href={`/verifier?site=${encodeURIComponent(site.id)}`}>
              {t('sites.verify')}
              <span class="visually-hidden">{site.label}</span>
            </a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  <form class="audit-form" method="dialog" onsubmit={onSubmit}>
    <div class="field">
      <label for="new-site">{t('sites.url')}</label>
      <input
        id="new-site"
        class="mono"
        name="url"
        type="text"
        required
        autocomplete="url"
        spellcheck="false"
        maxlength="2048"
        bind:value={url}
        aria-describedby={error ? 'site-error' : 'site-hint'}
        aria-invalid={error ? 'true' : undefined}
      />
      <p id="site-hint" class="hint">{t('home.url.hint')}</p>
    </div>
    {#if error}
      <p id="site-error" class="form-error" role="alert">{error}</p>
    {/if}
    <button class="button button-primary" type="submit">
      {pending ? t('sites.adding') : t('sites.add')}
    </button>
  </form>
  <p class="page-links">
    <button type="button" class="button button-link" onclick={onSignOut}>
      {t('sites.signout')}
    </button>
  </p>
{/if}
