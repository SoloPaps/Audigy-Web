<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { domainPlain } from '../lib/domains.js';
import { loginHref } from '../lib/nav.js';
import {
  progressEta,
  progressLive,
  progressPhase,
  runnerGap,
} from '../lib/progress-live.js';
import AuditOverlay from './AuditOverlay.svelte';

const POLL_MS = 1500;

let message = $state(t('progress.loading'));
let payload = $state<AuditPayload | null>(null);
let stopped = $state(false);
const names = $derived(
  (payload?.domains ?? [])
    .filter((domain) => typeof domain.score === 'number')
    .map((domain) => domainPlain(domain.domain)),
);
const waiting = $derived(
  payload?.audit.status === 'queued' || payload?.audit.status === 'running',
);
const gap = $derived(
  payload?.audit.status === 'done' ? runnerGap(payload.findings) : null,
);
const scoredDomains = $derived(
  (payload?.domains ?? []).filter((domain) => typeof domain.score === 'number'),
);
const eta = $derived(
  payload ? progressEta(payload.audit.status, scoredDomains.length) : null,
);
const phase = $derived(
  payload
    ? progressPhase(
        payload.audit.status,
        scoredDomains.length,
        scoredDomains.some((domain) => domain.domain === 'vie_privee'),
      )
    : null,
);

onMount(() => {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    message = t('progress.missing');
    stopped = true;
    return;
  }
  let timer = 0;
  let cancelled = false;

  const tick = async (): Promise<void> => {
    const session = await currentSession();
    if (cancelled) return;
    if (!session) {
      location.replace(loginHref(`${location.pathname}${location.search}`));
      return;
    }
    const result = await readAudit(session.access_token, id);
    if (cancelled) return;
    if (!result.ok) {
      message = result.status === 404 ? t('progress.missing') : result.message;
      stopped = true;
      return;
    }
    payload = result.payload;
    const status = result.payload.audit.status;
    if (status === 'done' || status === 'failed') {
      stopped = true;
      return;
    }
    timer = window.setTimeout(() => {
      void tick();
    }, POLL_MS);
  };

  void tick();
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
});
</script>

{#if payload}
  <p class="kicker">{payload.audit.site.url}</p>
{/if}
{#if payload && waiting}
  <AuditOverlay
    plain
    message={progressLive(payload.audit.status, names)}
    {phase}
    {eta}
  />
{:else}
  <p role="status" aria-live="polite">
    {payload ? progressLive(payload.audit.status, names) : message}
  </p>
  {#if phase}
    <p>{phase}</p>
  {/if}
  {#if eta}
    <p>{eta}</p>
  {/if}
  {#if gap}
    <p>{gap}</p>
  {/if}
  {#if payload && (payload.audit.status === 'done' || payload.audit.status === 'partial')}
    <p>
      <a class="link-action" href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('progress.report')}</a>
    </p>
  {/if}
  {#if payload?.audit.status === 'failed'}
    <p>
      <a class="link-action" href={`/lancer?site=${encodeURIComponent(payload.audit.site.id)}`}>{t('progress.retry')}</a>
    </p>
  {/if}
  {#if stopped && !payload}
    <p><a class="link-action" href="/sites">{t('nav.sites')}</a></p>
  {/if}
{/if}
