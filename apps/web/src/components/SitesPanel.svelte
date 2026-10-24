<script lang="ts">
import { onMount } from 'svelte';
import { formatDate, t } from '../i18n/index.js';
import {
  browserClient,
  currentSession,
  signOut,
} from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import {
  type PlaceSummary,
  type PlacesState,
  parsePlacesState,
} from '../lib/places-api.js';
import { latestAuditBySite, type SiteMark } from '../lib/site-tiles.js';
import { InvalidSiteUrl, normalizeSiteUrl } from '../lib/site-url.js';
import ReputationPanel from './ReputationPanel.svelte';
import ScoreGauge from './ScoreGauge.svelte';
import SiteShare from './SiteShare.svelte';
import StatusMark from './StatusMark.svelte';

interface SiteRow {
  id: string;
  url: string;
  label: string;
  host: string;
  isPublic: boolean;
  publicSlug: string | null;
  exposeSecurity: boolean;
}

let rows = $state<SiteRow[]>([]);
let marks = $state<Map<string, SiteMark>>(new Map());
let loading = $state(true);
let needLogin = $state(false);
let error = $state('');
let notice = $state('');
let url = $state('');
let pending = $state(false);
let userId = '';
let accessToken = $state('');
let places = $state<PlacesState | null>(null);

async function load(): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    loading = false;
    needLogin = true;
    return;
  }
  userId = session.user.id;
  accessToken = session.access_token;
  places = await loadPlaces(session.access_token);
  const { data, error: readError } = await supabase
    .from('sites')
    .select('id, url, label, host, is_public, public_slug, expose_security')
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
    isPublic: row.is_public,
    publicSlug: row.public_slug,
    exposeSecurity: row.expose_security,
  }));
  if (rows.length === 0) {
    marks = new Map();
    return;
  }
  const ids = rows.map((site) => site.id);
  const audits = await supabase
    .from('audits')
    .select('id, site_id, status, global_score, finished_at, created_at')
    .in('site_id', ids)
    .order('finished_at', { ascending: false, nullsFirst: false });
  marks = latestAuditBySite(Array.isArray(audits.data) ? audits.data : []);
}

onMount(() => {
  void load();
});

async function loadPlaces(token: string): Promise<PlacesState | null> {
  try {
    const response = await fetch('/api/places', {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    return parsePlacesState(await response.json());
  } catch {
    return null;
  }
}

function placeFor(siteId: string): PlaceSummary | null {
  return places?.places.find((item) => item.siteId === siteId) ?? null;
}

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
    .select('id, url, label, host, is_public, public_slug, expose_security')
    .single();
  pending = false;
  if (writeError || !data) {
    error =
      writeError?.code === '23505' ? t('sites.duplicate') : t('sites.error');
    return;
  }
  url = '';
  notice = t('sites.added');
  rows = [
    ...rows,
    {
      id: data.id,
      url: data.url,
      label: data.label,
      host: data.host,
      isPublic: data.is_public,
      publicSlug: data.public_slug,
      exposeSecurity: data.expose_security,
    },
  ].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
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
  <p><a class="link-action" href={loginHref('/sites')}>{t('nav.login')}</a></p>
{:else}
  <p><a class="link-action" href="/search-console">{t('gsc.connect')}</a></p>
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
  {#if rows.length === 0}
    <p>{t('sites.empty')}</p>
  {:else}
    <ul class="site-list stagger">
      {#each rows as site (site.id)}
        {@const mark = marks.get(site.id)}
        <li>
          {#if mark}
            <a
              class="site-tile lift glass glass-module"
              href={`/rapport?id=${encodeURIComponent(mark.auditId)}`}
            >
              <div class="glass-plate">
                <span>{site.label}</span>
                <span class="kicker">{site.url}</span>
                <span>{formatDate(new Date(mark.at))}</span>
                <ScoreGauge domain={site.label} score={mark.score} size="mini" />
              </div>
            </a>
          {:else}
            <a
              class="site-tile lift glass glass-module"
              href={`/lancer?site=${encodeURIComponent(site.id)}`}
            >
              <div class="glass-plate">
                <span>{site.label}</span>
                <span class="kicker">{site.url}</span>
                <StatusMark level="untested" />
                <span>{t('sites.audit')}</span>
              </div>
            </a>
          {/if}
          <div class="site-extra">
            <a class="link-action" href={`/verifier?site=${encodeURIComponent(site.id)}`}>
              {t('sites.verify')}
              <span class="visually-hidden">{site.label}</span>
            </a>
            {#if places?.enabled}
              <ReputationPanel
                siteId={site.id}
                token={accessToken}
                place={placeFor(site.id)}
              />
            {/if}
            <SiteShare {site} />
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

<style>
  .site-tile {
    display: flex;
    margin-bottom: var(--space-3);
    color: var(--ink);
    text-decoration: none;
  }

  .site-tile .glass-plate {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
  }

  .site-extra {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }
</style>
