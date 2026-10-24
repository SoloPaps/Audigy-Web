<script lang="ts">
import { onMount } from 'svelte';
import { type MessageKey, t } from '../i18n/index.js';
import { type AuditPayload, readAudit } from '../lib/audit-api.js';
import { currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';

const POLL_MS = 1500;

let message = $state(t('progress.loading'));
let payload = $state<AuditPayload | null>(null);
let stopped = $state(false);

function statusKey(status: string): MessageKey {
  if (status === 'queued') return 'progress.queued';
  if (status === 'running') return 'progress.running';
  if (status === 'partial') return 'progress.partial';
  if (status === 'done') return 'progress.done';
  if (status === 'failed') return 'progress.failed';
  return 'progress.loading';
}

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
    message = t(statusKey(result.payload.audit.status));
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
<p role="status" aria-live="polite">{message}</p>
{#if payload && (payload.audit.status === 'done' || payload.audit.status === 'partial')}
  <p>
    <a href={`/rapport?id=${encodeURIComponent(payload.audit.id)}`}>{t('progress.report')}</a>
  </p>
{/if}
{#if payload?.audit.status === 'failed'}
  <p>
    <a href={`/lancer?site=${encodeURIComponent(payload.audit.site.id)}`}>{t('progress.retry')}</a>
  </p>
{/if}
{#if stopped && !payload}
  <p><a href="/sites">{t('nav.sites')}</a></p>
{/if}
