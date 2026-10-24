<script lang="ts">
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';

type Choice = 'system' | 'light' | 'dark';

interface Props {
  initial?: Choice;
}

let { initial = 'system' }: Props = $props();
let chosen = $state<Choice | null>(null);
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

onMount(() => {
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
