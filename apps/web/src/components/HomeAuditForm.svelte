<script lang="ts">
import { t } from '../i18n/index.js';
import { isCompleteHttpUrl } from '../lib/site-url.js';

let invalid = $state(false);

function onSubmit(event: SubmitEvent): void {
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const raw = String(new FormData(form).get('url') ?? '').trim();
  if (isCompleteHttpUrl(raw)) {
    invalid = false;
    return;
  }
  event.preventDefault();
  invalid = true;
}
</script>

<form class="audit-form" action="/lancer" method="get" novalidate onsubmit={onSubmit}>
  <div class="field">
    <label for="site-url">{t('home.url')}</label>
    <input
      id="site-url"
      class="mono"
      name="url"
      type="url"
      inputmode="url"
      autocomplete="url"
      required
      spellcheck="false"
      maxlength="2048"
      placeholder={t('home.url.example')}
      aria-describedby={invalid ? 'url-error' : 'url-hint'}
      aria-invalid={invalid ? 'true' : undefined}
    />
    <p id="url-hint" class="hint">{t('home.url.hint')}</p>
    {#if invalid}
      <p id="url-error" class="form-error" aria-live="polite">{t('home.url.error')}</p>
    {/if}
  </div>
  <button class="button button-primary lift" type="submit">{t('home.submit')}</button>
</form>
<p class="page-links">
  <a href="/methode">{t('home.method')}</a>
</p>
