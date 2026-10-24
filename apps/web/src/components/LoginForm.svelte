<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import {
  currentSession,
  sendMagicLink,
  signOut,
} from '../lib/browser-session.js';
import { rememberNext, safeNext } from '../lib/nav.js';
import { authConfigured } from '../lib/public-config.js';

let email = $state('');
let error = $state('');
let sent = $state(false);
let pending = $state(false);
let ready = $state(false);
const configured = authConfigured();

onMount(async () => {
  const next = safeNext(new URLSearchParams(location.search).get('next'));
  rememberNext(next);
  const session = await currentSession();
  ready = session !== null;
});

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) && value.length <= 254;
}

async function onSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  error = '';
  sent = false;
  if (!configured) {
    error = t('login.unconfigured');
    return;
  }
  const value = email.trim().toLowerCase();
  if (!validEmail(value)) {
    error = t('login.invalid_email');
    return;
  }
  if (pending) return;
  pending = true;
  const redirectTo = `${location.origin}/compte/retour`;
  const result = await sendMagicLink(value, redirectTo);
  pending = false;
  if (!result.ok) {
    error = t('login.failed');
    return;
  }
  sent = true;
}

async function onSignOut(): Promise<void> {
  await signOut();
  ready = false;
}
</script>

{#if ready}
  <p role="status">{t('login.ready')}</p>
  <p class="page-links">
    <a href="/sites">{t('login.sites')}</a>
    <a href="/compte">{t('login.account')}</a>
    <button type="button" class="button button-secondary" onclick={onSignOut}>
      {t('login.signout')}
    </button>
  </p>
{:else}
  <form class="audit-form" method="dialog" onsubmit={onSubmit}>
    <div class="field">
      <label for="email">{t('login.email')}</label>
      <input
        id="email"
        name="email"
        type="email"
        autocomplete="email"
        inputmode="email"
        required
        bind:value={email}
        aria-describedby={error ? 'login-error' : undefined}
        aria-invalid={error ? 'true' : undefined}
      />
    </div>
    {#if error}
      <p id="login-error" class="form-error" role="alert">{error}</p>
    {/if}
    {#if sent}
      <p role="status">{t('login.sent')}</p>
    {/if}
    <button class="button button-primary" type="submit">
      {pending ? t('login.sending') : t('login.submit')}
    </button>
  </form>
{/if}
