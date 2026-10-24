<script lang="ts">
import { untrack } from 'svelte';
import { formatNumber } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import {
  formatRating,
  type PlaceCandidate,
  type PlaceSummary,
  parseCandidates,
  parseConfirmed,
} from '../lib/places-api.js';

interface Props {
  siteId: string;
  token: string;
  place: PlaceSummary | null;
}

let { siteId, token, place }: Props = $props();

let query = $state('');
let candidates = $state<PlaceCandidate[]>([]);
let current = $state<PlaceSummary | null>(untrack(() => place));
let pending = $state(false);
let error = $state('');
let empty = $state(false);

const fieldId = $derived(`place-query-${siteId}`);

async function post(body: unknown): Promise<unknown | null> {
  const response = await fetch('/api/places', {
    method: 'post'.toUpperCase(),
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
}

async function onSearch(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  empty = false;
  candidates = [];
  if (pending) return;
  pending = true;
  try {
    const body = await post({ action: 'search', siteId, query });
    const found = body ? parseCandidates(body) : null;
    if (!found) {
      error = t('places.error');
      return;
    }
    candidates = found;
    empty = found.length === 0;
  } catch {
    error = t('places.error');
  } finally {
    pending = false;
  }
}

async function onConfirm(id: string): Promise<void> {
  error = '';
  if (pending) return;
  pending = true;
  try {
    const body = await post({ action: 'confirm', siteId, placeId: id });
    const confirmed = body ? parseConfirmed(body) : null;
    if (!confirmed) {
      error = t('places.error');
      return;
    }
    current = confirmed;
    candidates = [];
    query = '';
  } catch {
    error = t('places.error');
  } finally {
    pending = false;
  }
}

async function onClear(): Promise<void> {
  error = '';
  if (pending) return;
  pending = true;
  try {
    const body = await post({ action: 'clear', siteId });
    if (!body) {
      error = t('places.error');
      return;
    }
    current = null;
  } catch {
    error = t('places.error');
  } finally {
    pending = false;
  }
}
</script>

<div class="site-place">
  <p class="hint">{t('places.lead')}</p>
  {#if current}
    <p>{t('places.confirmed')}</p>
    <p>{current.name}</p>
    {#if current.address}
      <p class="kicker">{current.address}</p>
    {/if}
    {#if current.rating !== null}
      <p>{t('places.rating', { rating: formatRating(current.rating) })}</p>
      <p>{t('places.count', { count: formatNumber(current.reviewCount ?? 0) })}</p>
    {:else}
      <p>{t('places.none')}</p>
    {/if}
    {#if current.score !== null}
      <p>{t('places.score', { score: current.score })}</p>
      <p class="hint">{t('places.aside.note')}</p>
    {/if}
    <button type="button" class="button button-link" disabled={pending} onclick={onClear}>
      {pending ? t('places.clearing') : t('places.clear')}
    </button>
  {:else}
    <form method="dialog" onsubmit={onSearch}>
      <div class="field">
        <label for={fieldId}>{t('places.search.label')}</label>
        <input
          id={fieldId}
          name="query"
          type="text"
          required
          minlength="2"
          maxlength="80"
          bind:value={query}
          aria-describedby={`${fieldId}-hint`}
        />
        <p id={`${fieldId}-hint`} class="hint">{t('places.search.hint')}</p>
      </div>
      <button class="button button-secondary" type="submit" disabled={pending}>
        {pending ? t('places.searching') : t('places.search.action')}
      </button>
    </form>
    {#if empty}
      <p role="status">{t('places.empty')}</p>
    {/if}
    {#if candidates.length > 0}
      <ul class="place-results">
        {#each candidates as item (item.id)}
          <li>
            <p>{item.name}</p>
            {#if item.address}
              <p class="kicker">{item.address}</p>
            {/if}
            <button
              type="button"
              class="button button-secondary"
              disabled={pending}
              onclick={() => onConfirm(item.id)}
            >
              {t('places.confirm')}
              <span class="visually-hidden">{item.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .site-place {
    flex: 1 1 100%;
    margin-top: var(--space-3);
  }

  .place-results {
    list-style: none;
    margin: var(--space-4) 0 0;
    padding: 0;
  }

  .place-results li {
    margin-bottom: var(--space-3);
  }

  .place-results p {
    margin: 0 0 var(--space-1);
  }
</style>
