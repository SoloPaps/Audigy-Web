<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { browserClient, currentSession } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import {
  checkVerification,
  createVerification,
  isVerificationError,
  type VerificationView,
} from '../lib/verify-api.js';
import { localChallenge } from '../lib/verify-challenge.js';
import { guidesFor, type VerifyMethod } from '../lib/verify-guides.js';

interface SiteRow {
  id: string;
  url: string;
  label: string;
  host: string;
  scope: 'origin' | 'path';
  pathPrefix: string | null;
}

interface StoredVerification {
  id: string;
  method: VerifyMethod;
  status: string;
  token: string;
}

const METHODS = ['dns_txt', 'file', 'meta'] as const;

let loading = $state(true);
let needLogin = $state(false);
let missing = $state(false);
let notFound = $state(false);
let error = $state('');
let notice = $state('');
let pending = $state(false);
let site = $state<SiteRow | null>(null);
let rows = $state<StoredVerification[]>([]);
let method = $state<VerifyMethod>('dns_txt');
let accessToken = '';

function isMethod(value: string): value is VerifyMethod {
  return value === 'dns_txt' || value === 'file' || value === 'meta';
}

function current(): StoredVerification | null {
  return rows.find((row) => row.method === method) ?? null;
}

function statusText(status: string): string {
  if (status === 'verified') return t('verify.verified');
  if (status === 'expired') return t('verify.expired');
  if (status === 'failed') return t('verify.failed');
  return t('verify.status.pending');
}

function methodLabel(value: VerifyMethod): string {
  if (value === 'dns_txt') return t('verify.method.dns');
  if (value === 'file') return t('verify.method.file');
  return t('verify.method.meta');
}

onMount(() => {
  void load();
});

async function load(): Promise<void> {
  const session = await currentSession();
  const supabase = browserClient();
  if (!session || !supabase) {
    loading = false;
    needLogin = true;
    return;
  }
  const params = new URLSearchParams(location.search);
  const siteId = params.get('site');
  if (!siteId) {
    loading = false;
    missing = true;
    return;
  }
  accessToken = session.access_token;
  const { data: siteRow, error: siteError } = await supabase
    .from('sites')
    .select('id, url, label, host, scope, path_prefix')
    .eq('id', siteId)
    .eq('owner_id', session.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (siteError || !siteRow) {
    loading = false;
    notFound = true;
    return;
  }
  site = {
    id: siteRow.id,
    url: siteRow.url,
    label: siteRow.label,
    host: siteRow.host,
    scope: siteRow.scope === 'path' ? 'path' : 'origin',
    pathPrefix: siteRow.path_prefix,
  };
  const { data: proofs, error: proofError } = await supabase
    .from('site_verifications')
    .select('id, method, status, token, created_at')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  loading = false;
  if (proofError) {
    error = t('verify.error');
    return;
  }
  rows = (proofs ?? []).flatMap((row) =>
    isMethod(row.method)
      ? [
          {
            id: row.id,
            method: row.method,
            status: row.status,
            token: row.token,
          },
        ]
      : [],
  );
  const first = rows[0];
  if (first) method = first.method;
}

function remember(view: VerificationView, nextMethod: VerifyMethod): void {
  const next: StoredVerification = {
    id: view.id,
    method: nextMethod,
    status: view.status,
    token: view.token,
  };
  rows = [next, ...rows.filter((row) => row.id !== next.id)];
}

async function onCreate(): Promise<void> {
  if (!site || pending) return;
  error = '';
  notice = '';
  pending = true;
  const result = await createVerification(accessToken, site.id, method);
  pending = false;
  if (isVerificationError(result)) {
    error = result.error;
    return;
  }
  remember(result, method);
}

async function onCheck(): Promise<void> {
  const row = current();
  if (!row || pending) return;
  error = '';
  notice = '';
  pending = true;
  const result = await checkVerification(accessToken, row.id);
  pending = false;
  if (isVerificationError(result)) {
    error = result.error;
    return;
  }
  remember(result, method);
}

async function onCopy(value: string): Promise<void> {
  error = '';
  try {
    await navigator.clipboard.writeText(value);
    notice = t('verify.copied');
  } catch {
    notice = '';
    error = t('verify.copy_failed');
  }
}
</script>

{#if loading}
  <p role="status">{t('verify.loading')}</p>
{:else if needLogin}
  <p role="status">{t('verify.need_login')}</p>
  <p>
    <a class="link-action" href={loginHref(`${location.pathname}${location.search}`)}>
      {t('nav.login')}
    </a>
  </p>
{:else if missing}
  <p role="status">{t('verify.missing')}</p>
  <p><a class="link-action" href="/sites">{t('verify.back')}</a></p>
{:else if notFound || !site}
  <p role="status">{t('verify.not_found')}</p>
  <p><a class="link-action" href="/sites">{t('verify.back')}</a></p>
{:else}
  <p class="kicker">{site.label}</p>
  <p>{site.url}</p>
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
  <fieldset class="choices">
    <legend>{t('verify.method')}</legend>
    {#each METHODS as item (item)}
      <label>
        <input type="radio" name="method" value={item} bind:group={method} />
        {methodLabel(item)}
      </label>
    {/each}
  </fieldset>
  {#if method === 'dns_txt' && site.host.endsWith('.github.io')}
    <p>{t('verify.github.dns')}</p>
  {/if}
  {#each guidesFor(method) as guide (guide.title)}
    <section>
      <h2>{t(guide.title)}</h2>
      <ol class="steps">
        {#each guide.steps as step, index (step + String(index))}
          <li>{t(step)}</li>
        {/each}
      </ol>
    </section>
  {/each}
  {#if current()}
    {@const proof = current()}
    {@const challenge = localChallenge(site, proof?.token ?? '')}
    <div class="challenge">
      <p role="status">{statusText(proof?.status ?? 'pending')}</p>
      <p>{t('verify.token')}</p>
      <pre>{proof?.token}</pre>
      {#if method === 'dns_txt'}
        <p>{t('verify.record_name')}</p>
        <pre>{challenge.dnsName}</pre>
        <p>{t('verify.record_value')}</p>
        <pre>{challenge.dnsValue}</pre>
      {:else if method === 'file'}
        <p>{t('verify.file_url')}</p>
        <pre>{challenge.fileUrl}</pre>
      {:else}
        <p>{t('verify.meta_tag')}</p>
        <pre>{challenge.metaTag}</pre>
      {/if}
      <button
        class="button button-secondary"
        type="button"
        onclick={() => onCopy(proof?.token ?? '')}
      >
        {t('verify.copy')}
      </button>
    </div>
    <button
      class="button button-primary"
      type="button"
      disabled={pending}
      onclick={onCheck}
    >
      {pending ? t('verify.checking') : t('verify.check')}
    </button>
  {:else}
    <button
      class="button button-primary"
      type="button"
      disabled={pending}
      onclick={onCreate}
    >
      {pending ? t('verify.creating') : t('verify.create')}
    </button>
  {/if}
  <p class="page-links">
    <a class="link-action" href="/sites">{t('verify.back')}</a>
  </p>
{/if}
