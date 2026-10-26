<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';

type Choice = 'system' | 'light' | 'dark';
type Locale = 'fr' | 'en';

interface Props {
  initial?: Choice;
}

let { initial = 'system' }: Props = $props();
let chosen = $state<Choice | null>(null);
let locale = $state<Locale>('fr');
const value = $derived(chosen ?? initial);

function apply(next: Choice, persist: boolean): void {
  chosen = next;
  const root = document.documentElement;
  if (next === 'system') {
    if (persist) localStorage.removeItem('audigy-theme');
    root.removeAttribute('data-theme');
    return;
  }
  if (persist) localStorage.setItem('audigy-theme', next);
  root.setAttribute('data-theme', next);
}

function onChange(event: Event): void {
  const next = (event.currentTarget as HTMLSelectElement).value;
  if (next === 'light' || next === 'dark' || next === 'system')
    apply(next, true);
}

async function onLocale(event: Event): Promise<void> {
  const next = (event.currentTarget as HTMLSelectElement).value;
  if (next !== 'fr' && next !== 'en') return;
  if (next === locale) return;
  try {
    if (next === 'en' && !localStorage.getItem('audigy-en')) {
      const res = await fetch('/dictionnaire-en.json');
      if (!res.ok) return;
      localStorage.setItem('audigy-en', await res.text());
    }
    localStorage.setItem('audigy-locale', next);
    location.reload();
  } catch {
    locale = 'fr';
  }
}

onMount(() => {
  const savedLocale = localStorage.getItem('audigy-locale');
  if (savedLocale === 'en') locale = 'en';
  const query = new URLSearchParams(location.search).get('theme');
  if (query === 'light' || query === 'dark') {
    apply(query, false);
    return;
  }
  if (initial === 'light' || initial === 'dark') return;
  const saved = localStorage.getItem('audigy-theme');
  if (saved === 'light' || saved === 'dark') apply(saved, false);
});
</script>

<label class="theme">
  <span>{t('theme.label')}</span>
  <select {value} onchange={onChange}>
    <option value="system">{t('theme.system')}</option>
    <option value="light">{t('theme.light')}</option>
    <option value="dark">{t('theme.dark')}</option>
  </select>
</label>
<label class="theme">
  <span class="visually-hidden">{t('locale.label')}</span>
  <select aria-label={t('locale.label')} value={locale} onchange={onLocale}>
    <option value="fr">{t('locale.fr')}</option>
    <option value="en">{t('locale.en')}</option>
  </select>
</label>
