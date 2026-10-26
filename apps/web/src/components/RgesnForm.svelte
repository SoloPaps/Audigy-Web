<script lang="ts">
import { RGESN_QUESTIONS, RGESN_THEMES } from '@audigy/engine/questionnaire';
import { onMount } from 'svelte';
import { tReport } from '../i18n/report-fr.js';
import { collectRgesn } from '../lib/rgesn-form.js';
import { translate } from '../lib/translate.js';

const STORAGE = 'audigy-rgesn';

let values = $state<Record<string, string>>({});
let notice = $state('');

const answers = ['oui', 'partiel', 'non', 'na'] as const;

function text(key: string, params?: Record<string, string | number>): string {
  return translate(key, params) ?? key;
}

function save(next: Record<string, string>): void {
  const kept: Record<string, string> = {};
  for (const row of collectRgesn(next)) kept[row.id] = row.answer;
  values = kept;
  localStorage.setItem(STORAGE, JSON.stringify(kept));
  const answered = Object.keys(kept).length;
  notice =
    answered === 0
      ? tReport('rgesn.screen.empty')
      : text('rgesn.screen.progress', { answered, total: 78 });
}

function onSubmit(event: SubmitEvent): void {
  event.preventDefault();
  const data = new FormData(event.currentTarget as HTMLFormElement);
  const next: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') next[key] = value;
  }
  save(next);
}

onMount(() => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (parsed && typeof parsed === 'object') values = parsed;
  } catch {
    values = {};
  }
});
</script>

<form onsubmit={onSubmit}>
  <p>{tReport('rgesn.screen.lead')}</p>
  {#each RGESN_THEMES as theme (theme)}
    <fieldset>
      <legend>{text(`rgesn.theme.${theme}`)}</legend>
      {#each RGESN_QUESTIONS.filter((item) => item.theme === theme) as question (question.id)}
        <div class="rgesn-row">
          <p id={`q-${question.id}`}>{text(question.promptKey)}</p>
          <div role="radiogroup" aria-labelledby={`q-${question.id}`}>
            {#each answers as answer (answer)}
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value={answer}
                  checked={values[question.id] === answer}
                />
                <span>{text(`rgesn.answer.${answer}`)}</span>
              </label>
            {/each}
          </div>
        </div>
      {/each}
    </fieldset>
  {/each}
  <button type="submit" class="button">{tReport('rgesn.screen.submit')}</button>
  {#if notice}
    <p role="status">{notice}</p>
  {/if}
</form>

<style>
  fieldset {
    margin: var(--space-4) 0;
    border: var(--border) solid var(--line);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }

  .rgesn-row + .rgesn-row {
    margin-top: var(--space-3);
  }

  label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--touch-min);
    margin-inline-end: var(--space-3);
  }
</style>
