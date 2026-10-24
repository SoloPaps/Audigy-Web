<script lang="ts">
import { TERMS_VERSION } from '@audigy/db';
import { onMount } from 'svelte';
import { formatDate, t } from '../i18n/index.js';
import { currentSession, signOut } from '../lib/browser-session.js';
import { loginHref } from '../lib/nav.js';
import { authConfigured } from '../lib/public-config.js';

let ready = $state(false);
let configured = $state(false);
let loggedIn = $state(false);
let email = $state('');
let accepted = $state(false);
let acceptedAt = $state<string | null>(null);
let version = $state<string>(TERMS_VERSION);
let checked = $state(false);
let confirmOpen = $state(false);
let pending = $state(false);
let status = $state('');
let error = $state('');
let token = $state('');

onMount(async () => {
  configured = authConfigured();
  ready = true;
  if (!configured) return;
  const session = await currentSession();
  if (!session) return;
  token = session.access_token;
  email = session.user.email ?? '';
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
  const body = (await res.json()) as {
    accepted?: boolean;
    acceptedAt?: string | null;
    version?: string;
  };
  accepted = body.accepted === true;
  acceptedAt = body.acceptedAt ?? null;
  if (typeof body.version === 'string' && body.version.length > 0) {
    version = body.version;
  }
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
  await loadTerms();
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

async function onSignOut(): Promise<void> {
  await signOut();
  location.assign('/');
}

async function onDelete(): Promise<void> {
  error = '';
  status = '';
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
  <p><a class="link-action" href={loginHref('/compte')}>{t('account.login')}</a></p>
  {#if status}
    <p role="status">{status}</p>
  {/if}
{:else if loggedIn}
  <section class="glass glass-module">
    <div class="glass-plate">
      <p>{email}</p>
      <button type="button" class="button button-secondary" onclick={onSignOut}>
        {t('login.signout')}
      </button>
    </div>
  </section>
  <section class="glass glass-module">
    <div class="glass-plate">
      {#if accepted && acceptedAt}
        <p>
          {t('account.terms.when', {
            date: formatDate(new Date(acceptedAt)),
            version,
          })}
        </p>
        <a class="link-inline" href="/cgu">{t('account.terms.link')}</a>
      {:else}
        <p>
          {accepted
            ? t('account.terms.ok', { version })
            : t('account.terms.missing', { version })}
        </p>
        <a class="link-inline" href="/cgu">{t('account.terms.link')}</a>
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
      {/if}
    </div>
  </section>
  <section class="glass glass-module">
    <div class="glass-plate">
      <button
        class="button button-primary"
        type="button"
        disabled={pending}
        onclick={onExport}
      >
        {t('account.export.action')}
      </button>
      <p>{t('account.export.hint')}</p>
    </div>
  </section>
  <section class="glass glass-module">
    <div class="glass-plate">
      {#if confirmOpen}
        <p>{t('account.delete.confirm')}</p>
        <p class="page-links">
          <button
            type="button"
            class="button button-link"
            onclick={() => {
              confirmOpen = false;
            }}
          >
            {t('account.delete.cancel')}
          </button>
          <button
            type="button"
            class="button button-bordered"
            onclick={onDelete}
            disabled={pending}
          >
            {t('account.delete.forever')}
          </button>
        </p>
      {:else}
        <button
          type="button"
          class="button button-bordered"
          onclick={() => {
            confirmOpen = true;
          }}
        >
          {t('account.delete.open')}
        </button>
      {/if}
    </div>
  </section>
  {#if error}
    <p class="form-error" role="alert">{error}</p>
  {/if}
  {#if status}
    <p role="status">{status}</p>
  {/if}
{/if}
