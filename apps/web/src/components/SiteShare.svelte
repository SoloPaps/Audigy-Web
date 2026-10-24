<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { browserClient } from '../lib/browser-session.js';
import { scoreBadgeSvg, shareIsOpen } from '../lib/public-score.js';

interface SiteShareRow {
  id: string;
  label: string;
  isPublic: boolean;
  publicSlug: string | null;
  exposeSecurity: boolean;
}

interface Props {
  site: SiteShareRow;
}

let { site }: Props = $props();

let isPublic = $state(false);
let publicSlug = $state<string | null>(null);
let exposeSecurity = $state(false);
let auditId = $state<string | null>(null);
let globalScore = $state<number | null>(null);
let shareToken = $state<string | null>(null);
let shareId = $state<string | null>(null);
let pending = $state(false);
let error = $state('');
let notice = $state('');

const publicHref = $derived(
  isPublic && publicSlug ? `${location.origin}/score/${publicSlug}` : '',
);
const shareHref = $derived(
  shareToken ? `${location.origin}/partage/${shareToken}` : '',
);

function newSlug(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

onMount(() => {
  isPublic = site.isPublic;
  publicSlug = site.publicSlug;
  exposeSecurity = site.exposeSecurity;
  void loadAudit();
});

async function loadAudit(): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  const { data, error: readError } = await supabase
    .from('audits')
    .select('id, global_score, finished_at, status')
    .eq('site_id', site.id)
    .in('status', ['done', 'partial']);
  if (readError || !Array.isArray(data)) return;
  const latest = data
    .filter((row) => row.finished_at !== null)
    .sort((a, b) => (a.finished_at ?? '').localeCompare(b.finished_at ?? ''))
    .at(-1);
  if (!latest) return;
  auditId = latest.id;
  globalScore = latest.global_score;
  const { data: reports } = await supabase
    .from('reports')
    .select('id, share_token, visibility, revoked_at')
    .eq('audit_id', latest.id)
    .eq('visibility', 'link')
    .is('revoked_at', null)
    .limit(1);
  const open = Array.isArray(reports) ? reports[0] : undefined;
  if (!open) return;
  if (
    !shareIsOpen({ visibility: open.visibility, revokedAt: open.revoked_at })
  ) {
    return;
  }
  shareId = open.id;
  shareToken = open.share_token;
}

async function setPublic(next: boolean): Promise<void> {
  const supabase = browserClient();
  if (!supabase || pending) return;
  pending = true;
  error = '';
  notice = '';
  let slug = publicSlug;
  if (next && (slug === null || slug === '')) slug = newSlug();
  const { data, error: writeError } = await supabase
    .from('sites')
    .update({ is_public: next, public_slug: slug })
    .eq('id', site.id)
    .select('is_public, public_slug')
    .single();
  pending = false;
  if (writeError || !data) {
    error =
      writeError?.code === '23505' ? t('sites.slug.taken') : t('sites.error');
    return;
  }
  isPublic = data.is_public;
  publicSlug = data.public_slug;
}

async function setExpose(next: boolean): Promise<void> {
  const supabase = browserClient();
  if (!supabase || pending) return;
  pending = true;
  error = '';
  const { data, error: writeError } = await supabase
    .from('sites')
    .update({ expose_security: next })
    .eq('id', site.id)
    .select('expose_security')
    .single();
  pending = false;
  if (writeError || !data) {
    error = t('sites.error');
    return;
  }
  exposeSecurity = data.expose_security;
}

async function createShare(): Promise<void> {
  const supabase = browserClient();
  if (!supabase || pending) return;
  if (!auditId) {
    error = t('sites.share.need_audit');
    return;
  }
  pending = true;
  error = '';
  notice = '';
  const { data, error: writeError } = await supabase
    .from('reports')
    .insert({ audit_id: auditId, visibility: 'link' })
    .select('id, share_token, visibility, revoked_at')
    .single();
  pending = false;
  if (writeError || !data) {
    error = t('sites.error');
    return;
  }
  if (
    !shareIsOpen({ visibility: data.visibility, revokedAt: data.revoked_at })
  ) {
    notice = t('sites.share.revoked');
    return;
  }
  shareId = data.id;
  shareToken = data.share_token;
}

async function revokeShare(): Promise<void> {
  const supabase = browserClient();
  if (!supabase || pending || !shareId) return;
  pending = true;
  error = '';
  const revokedAt = new Date().toISOString();
  const { data, error: writeError } = await supabase
    .from('reports')
    .update({ revoked_at: revokedAt })
    .eq('id', shareId)
    .select('visibility, revoked_at')
    .single();
  pending = false;
  if (writeError || !data) {
    error = t('sites.error');
    return;
  }
  if (
    shareIsOpen({ visibility: data.visibility, revokedAt: data.revoked_at })
  ) {
    error = t('sites.error');
    return;
  }
  shareToken = null;
  shareId = null;
  notice = t('sites.share.revoked');
}

function download(): void {
  const svg = scoreBadgeSvg(site.label, globalScore);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audigy-score.svg';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<div class="share">
  <fieldset class="choices">
    <legend>{t('sites.share.label')}</legend>
    <label>
      <input
        type="checkbox"
        checked={isPublic}
        disabled={pending}
        onchange={(event) => setPublic(event.currentTarget.checked)}
      />
      {t('sites.publish')}
    </label>
    <p class="hint">{t('sites.publish.hint')}</p>
    <label>
      <input
        type="checkbox"
        checked={exposeSecurity}
        disabled={pending}
        onchange={(event) => setExpose(event.currentTarget.checked)}
      />
      {t('sites.security')}
    </label>
    <p class="hint">{t('sites.security.hint')}</p>
    {#if publicHref}
      <p>
        <a class="link-inline" href={publicHref}>{publicHref}</a>
      </p>
    {/if}
    {#if shareHref}
      <p class="kicker">{shareHref}</p>
      <p>
        <button type="button" class="button button-secondary" disabled={pending} onclick={revokeShare}>
          {pending ? t('sites.share.revoking') : t('sites.share.revoke')}
        </button>
      </p>
    {:else}
      <p>
        <button type="button" class="button button-secondary" disabled={pending} onclick={createShare}>
          {pending ? t('sites.share.creating') : t('sites.share.create')}
        </button>
      </p>
    {/if}
    <p>
      <button type="button" class="button button-secondary" onclick={download}>
        {t('sites.badge')}
      </button>
    </p>
    <p class="hint">{t('sites.badge.hint')}</p>
    {#if notice}
      <p role="status">{notice}</p>
    {/if}
    {#if error}
      <p class="form-error" role="alert">{error}</p>
    {/if}
  </fieldset>
</div>

<style>
  .share {
    flex-basis: 100%;
  }
</style>
