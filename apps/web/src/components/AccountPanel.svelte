<script lang="ts">
import { TERMS_VERSION } from '@audigy/db';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { currentSession, signOut } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import { authConfigured } from '../lib/public-config.js';

let ready = $state(false);
let configured = $state(false);
let loggedIn = $state(false);
let accepted = $state(false);
let checked = $state(false);
let confirm = $state('');
let pending = $state(false);
let status = $state('');
let error = $state('');
let token = $state('');

const version = TERMS_VERSION;

onMount(async () => {
  configured = authConfigured();
  ready = true;
  if (!configured) return;
  const session = await currentSession();
  if (!session) return;
  token = session.access_token;
  loggedIn = true;
  await loadTerms();
});

function failure(code: string | undefined): string {
  if (code === 'terms_version') return t('api.error.terms_version');
  if (code === 'unauthorized') return t('api.error.unauthorized');
  return t('account.error');
}

async function readCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return failure(body.error);
  } catch {
    return t('account.error');
  }
}

async function loadTerms(): Promise<void> {
  const res = await fetch('/api/compte/cgu', {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    error = await readCode(res);
    return;
  }
  const body = (await res.json()) as { accepted?: boolean };
  accepted = body.accepted === true;
}

async function onAccept(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  status = '';
  if (!checked) {
    error = t('account.terms.required');
    return;
  }
  if (pending) return;
  pending = true;
  const res = await fetch('/api/compte/cgu', {
    method: 'post'.toUpperCase(),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ version }),
  });
  pending = false;
  if (!res.ok) {
    error = await readCode(res);
    return;
  }
  accepted = true;
  status = t('account.terms.done');
}

async function onExport(): Promise<void> {
  error = '';
  status = '';
  if (pending) return;
  pending = true;
  const res = await fetch('/api/compte/export', {
    headers: { authorization: `Bearer ${token}` },
  });
  pending = false;
  if (!res.ok) {
    error = await readCode(res);
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audigy-donnees.json';
  link.click();
  URL.revokeObjectURL(url);
  status = t('account.export.done');
}

async function onDelete(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  status = '';
  if (confirm.trim() !== 'supprimer') {
    error = t('account.error');
    return;
  }
  if (pending) return;
  pending = true;
  const res = await fetch('/api/compte/suppression', {
    method: 'post'.toUpperCase(),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'supprimer' }),
  });
  pending = false;
  if (!res.ok) {
    error = await readCode(res);
    return;
  }
  await signOut();
  loggedIn = false;
  status = t('account.delete.done');
}
</script>

{#if ready && !configured}
  <p role="status">{t('login.unconfigured')}</p>
{:else if ready && !loggedIn}
  <p>{t('account.out')}</p>
  <p><a href={loginHref('/compte')}>{t('account.login')}</a></p>
  {#if status}
    <p role="status">{status}</p>
  {/if}
{:else if loggedIn}
  <p>
    {#if accepted}
      {t('account.terms.ok', { version })}
    {:else}
      {t('account.terms.missing', { version })}
    {/if}
    <a href="/cgu">{t('account.terms.link')}</a>
  </p>
  {#if !accepted}
    <form class="audit-form" method="dialog" onsubmit={onAccept}>
      <div class="field">
        <label>
          <input type="checkbox" bind:checked={checked} />
          {t('account.terms.check')}
        </label>
      </div>
      <button class="button button-primary" type="submit" disabled={pending}>
        {t('account.terms.action')}
      </button>
    </form>
  {/if}
  <p class="page-links">
    <button
      class="button button-secondary"
      type="button"
      disabled={pending}
      onclick={onExport}
    >
      {t('account.export.action')}
    </button>
  </p>
  <form class="audit-form" method="dialog" onsubmit={onDelete}>
    <div class="field">
      <label for="delete-confirm">{t('account.delete.label')}</label>
      <input
        id="delete-confirm"
        name="confirm"
        type="text"
        autocomplete="off"
        spellcheck="false"
        bind:value={confirm}
        aria-describedby="delete-hint"
      />
      <p id="delete-hint" class="hint">{t('account.delete.hint')}</p>
    </div>
    <button class="button button-secondary" type="submit" disabled={pending}>
      {t('account.delete.action')}
    </button>
  </form>
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
  {#if status}
    <p role="status">{status}</p>
  {/if}
{/if}
