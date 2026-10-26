<script lang="ts">
import { t } from '../i18n/index.js';
import { fixesFor, hostingOf } from '../lib/fix-catalog.js';
import { type Priority } from '../lib/priorities.js';
import { relaunchHref } from '../lib/relaunch.js';

interface Props {
  priorities: Priority[];
  siteId: string;
  hosting: string;
}

type Host = 'netlify' | 'github_pages' | 'other';

let { priorities, siteId, hosting }: Props = $props();

const HOSTS: { id: Host; label: string }[] = [
  { id: 'netlify', label: t('priorities.guide.host.netlify') },
  { id: 'github_pages', label: t('priorities.guide.host.github_pages') },
  { id: 'other', label: t('priorities.guide.host.other') },
];

let host = $state<Host>(hostingOf(hosting));
let openId = $state<string | null>(null);
let added = $state<Record<string, boolean>>({});
let copied = $state(false);
let dialog = $state<HTMLDialogElement | null>(null);

const current = $derived(priorities.find((item) => item.id === openId) ?? null);
const fix = $derived(
  current?.fixKey ? (fixesFor(host).get(current.fixKey) ?? null) : null,
);

function difficultyLabel(item: Priority): string {
  if (item.difficulty === 'easy') return t('priorities.difficulty.easy');
  if (item.difficulty === 'medium') return t('priorities.difficulty.medium');
  return t('priorities.difficulty.hard');
}

function actorLabel(item: Priority): string {
  if (item.actor === 'owner') return t('priorities.actor.owner');
  if (item.actor === 'developer') return t('priorities.actor.developer');
  return t('priorities.actor.sysadmin');
}

function hasGuide(item: Priority): boolean {
  if (!item.fixKey) return false;
  const view = fixesFor(host).get(item.fixKey);
  return view !== undefined && view.steps.length > 0;
}

function openGuide(item: Priority): void {
  openId = item.id;
  copied = false;
  dialog?.showModal();
}

function closeGuide(): void {
  dialog?.close();
}

async function copyCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    copied = true;
  } catch {
    copied = false;
  }
}

function addToBrief(item: Priority): void {
  added = { ...added, [item.id]: true };
  window.dispatchEvent(
    new CustomEvent('audigy:brief-add', { detail: { checkId: item.checkId } }),
  );
}
</script>

{#if priorities.length > 0}
  <section class="priorities" aria-labelledby="priorities-title">
    <h2 id="priorities-title">{t('priorities.title')}</h2>
    <p class="hint">{t('priorities.subtitle')}</p>
    <ol class="list">
      {#each priorities as item, index (item.id)}
        <li class="item">
          <span class="rank" aria-hidden="true">{index + 1}</span>
          <div class="body">
            <h3>{item.title}</h3>
            <p class="why">{item.why}</p>
            <p class="meta">
              {#if item.minutes !== null}
                <span>{t('priorities.duration', { minutes: item.minutes })}</span>
              {/if}
              <span>{difficultyLabel(item)}</span>
              <span>{actorLabel(item)}</span>
            </p>
            <p class="actions no-print">
              {#if hasGuide(item)}
                <button type="button" class="button button-secondary" onclick={() => openGuide(item)}>
                  {t('priorities.btn.fix')}
                  <span class="visually-hidden">{item.title}</span>
                </button>
              {/if}
              <button
                type="button"
                class="button button-secondary"
                aria-pressed={added[item.id] === true}
                onclick={() => addToBrief(item)}
              >
                {added[item.id] ? t('priorities.added') : t('priorities.btn.brief')}
                <span class="visually-hidden">{item.title}</span>
              </button>
            </p>
          </div>
        </li>
      {/each}
    </ol>
    <div class="bridge no-print">
      <h3>{t('priorities.bridge.title')}</h3>
      <p>{t('priorities.bridge.desc')}</p>
      <p><a class="link-action" href="#corrections">{t('priorities.bridge.action')}</a></p>
    </div>
  </section>
{/if}

<dialog bind:this={dialog} class="guide" aria-labelledby="guide-title">
  {#if current}
    <h2 id="guide-title">{t('priorities.guide.modal.title')}</h2>
    <p class="guide-name">{current.title}</p>
    <div class="field">
      <label for="guide-host">{t('priorities.guide.host.label')}</label>
      <select id="guide-host" bind:value={host}>
        {#each HOSTS as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </div>
    {#if fix}
      <ol class="steps">
        {#each fix.steps as step, index (`${current.id}-${index}`)}
          <li>
            <span class="step-label">{t('priorities.guide.step', { step: index + 1 })}</span>
            {step}
          </li>
        {/each}
      </ol>
      {#if fix.code}
        <pre><code>{fix.code}</code></pre>
        <button type="button" class="button button-secondary" onclick={() => copyCode(fix.code ?? '')}>
          {copied ? t('priorities.guide.copied') : t('priorities.guide.copy')}
        </button>
      {/if}
      {#if fix.sourceHref && fix.sourceLabel}
        <p>
          <a class="link-inline" href={fix.sourceHref}>
            {fix.sourceLabel}
            <span class="visually-hidden">, {t('link.external')}</span>
          </a>
        </p>
      {/if}
    {/if}
    <p class="hint">{t('priorities.guide.recheck_hint')}</p>
    <p class="guide-actions">
      <a class="button button-primary" href={relaunchHref(siteId)}>{t('priorities.guide.verify_after')}</a>
      <button type="button" class="button button-secondary" onclick={closeGuide}>
        {t('priorities.guide.modal.close')}
      </button>
    </p>
  {/if}
</dialog>

<style>
  .list {
    margin: var(--space-4) 0 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: grid;
    grid-template-columns: var(--space-7) minmax(0, 1fr);
    gap: var(--space-3);
    padding-block: var(--space-4);
    border-top: var(--border) solid var(--line);
  }

  .rank {
    display: grid;
    place-items: center;
    width: var(--space-7);
    height: var(--space-7);
    border: var(--border) solid var(--ink);
    border-radius: var(--radius-pill);
    background: var(--surface);
    font: 600 var(--text-lg) / 1 var(--font-text);
  }

  h3 {
    margin: 0 0 var(--space-1);
  }

  .why {
    margin: 0 0 var(--space-2);
    max-width: var(--line-length);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin: 0 0 var(--space-3);
    color: var(--ink-2);
    font-size: var(--text-sm);
  }

  .actions,
  .guide-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin: 0;
  }

  .bridge {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: var(--border) solid var(--line);
  }

  .guide {
    width: min(100% - var(--space-5), var(--line-length));
    max-height: 90vh;
    padding: var(--space-5);
    overflow: auto;
    border: var(--border) solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
  }

  .guide::backdrop {
    background: var(--ink);
    opacity: 0.4;
  }

  .guide-name {
    color: var(--ink-2);
  }

  .steps {
    margin: var(--space-3) 0;
    padding-inline-start: var(--space-5);
  }

  .steps li + li {
    margin-top: var(--space-2);
  }

  .step-label {
    display: block;
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  pre {
    margin: 0 0 var(--space-3);
    padding: var(--space-4);
    overflow-x: auto;
    border: var(--border) solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--paper);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
