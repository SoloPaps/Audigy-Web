<script lang="ts">
import {
  type DossierPublic,
  type HorodatagePublic,
  lireDossier,
  manifesteCanonique,
  signatureCorrespond,
  type VerdictFichier,
  verdictFichier,
} from '@audigy/evidence/browser';
import { onMount } from 'svelte';
import { t } from '../i18n/index.js';
import { formatReportStamp } from '../lib/format-report-stamp.js';
import { qrPath } from '../lib/qr-path.js';

const MAX_OCTETS = 20 * 1024 * 1024;
const UUID =
  /\/verifier\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

let phase = $state<'loading' | 'missing' | 'invalid' | 'ready'>('loading');
let dossier = $state<DossierPublic | null>(null);
let signature = $state<'wait' | 'ok' | 'bad' | 'absent'>('wait');
let verdict = $state<VerdictFichier | null>(null);
let fichierMessage = $state('');
let qr = $state<{ d: string; size: number } | null>(null);

onMount(() => {
  let actif = true;
  const trouve = window.location.pathname.match(UUID);
  const id = trouve?.[1];
  if (!id) {
    phase = 'invalid';
    return () => {
      actif = false;
    };
  }
  qr = qrPath(`${window.location.origin}/verifier/${id}`);
  void charger(id, () => actif);
  return () => {
    actif = false;
  };
});

function estJwk(
  valeur: unknown,
): valeur is { kty: string; crv: string; x: string } {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const jwk = valeur as { kty?: unknown; crv?: unknown; x?: unknown };
  return (
    jwk.kty === 'OKP' && jwk.crv === 'Ed25519' && typeof jwk.x === 'string'
  );
}

function versHex(octets: Uint8Array): string {
  let out = '';
  for (const byte of octets) out += byte.toString(16).padStart(2, '0');
  return out;
}

function depuisBase64(valeur: string): Uint8Array | null {
  try {
    const binaire = atob(valeur);
    const out = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i += 1) out[i] = binaire.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function octetBuffer(octets: Uint8Array): ArrayBuffer {
  return octets.buffer.slice(
    octets.byteOffset,
    octets.byteOffset + octets.byteLength,
  ) as ArrayBuffer;
}

async function charger(id: string, encore: () => boolean): Promise<void> {
  try {
    const reponse = await fetch(`/preuves/${id}.json`);
    if (!encore()) return;
    if (reponse.status === 404) {
      phase = 'missing';
      return;
    }
    if (!reponse.ok) {
      phase = 'invalid';
      return;
    }
    const lu = lireDossier(await reponse.json());
    if (!encore()) return;
    if (!lu || lu.id !== id) {
      phase = 'invalid';
      return;
    }
    dossier = lu;
    phase = 'ready';
    if (!lu.signature) {
      signature = 'absent';
      return;
    }
    const cleReponse = await fetch('/.well-known/audigy-signing-key');
    if (!encore()) return;
    if (!cleReponse.ok) {
      signature = 'bad';
      return;
    }
    const document = (await cleReponse.json()) as { jwk?: unknown };
    const jwk = document.jwk;
    if (!estJwk(jwk)) {
      signature = 'bad';
      return;
    }
    const ok = await signatureCorrespond(
      manifesteCanonique(lu.manifeste),
      lu.signature,
      jwk,
    );
    if (!encore()) return;
    signature = ok ? 'ok' : 'bad';
  } catch {
    if (encore()) phase = 'invalid';
  }
}

async function choisirFichier(event: Event): Promise<void> {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement) || !dossier) return;
  const fichier = input.files?.[0];
  verdict = null;
  fichierMessage = '';
  if (!fichier) return;
  if (fichier.size > MAX_OCTETS) {
    fichierMessage = t('verifier.tooBig');
    return;
  }
  const empreinte = await crypto.subtle.digest(
    'SHA-256',
    await fichier.arrayBuffer(),
  );
  verdict = verdictFichier(
    versHex(new Uint8Array(empreinte)),
    dossier.manifeste,
  );
}

function sauverJeton(item: HorodatagePublic, index: number): void {
  const octets = depuisBase64(item.jetonBase64);
  if (!octets) return;
  telecharger(`jeton-${index + 1}.tsr`, new Blob([octetBuffer(octets)]));
}

function sauverChaine(item: HorodatagePublic, index: number): void {
  telecharger(
    `chaine-${index + 1}.pem`,
    new Blob([item.chainePem], { type: 'application/x-pem-file' }),
  );
}

function telecharger(nom: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(url);
}
</script>

{#if phase === 'loading'}
  <p role="status">{t('verifier.loading')}</p>
{:else if phase === 'missing'}
  <p role="status">{t('verifier.missing')}</p>
{:else if phase === 'invalid' || !dossier}
  <p role="status">{t('verifier.invalid')}</p>
{:else}
  <dl class="facts">
    <dt>{t('verifier.date')}</dt>
    <dd>{formatReportStamp(new Date(dossier.date))}</dd>
    <dt>{t('verifier.fingerprint')}</dt>
    <dd class="mono">{dossier.empreinte}</dd>
  </dl>

  <h2>{t('verifier.stamps')}</h2>
  {#if dossier.horodatages.length === 0}
    <p>{t('verifier.empty')}</p>
  {:else}
    <ul class="stamps">
      {#each dossier.horodatages as item (item.jetonBase64)}
        <li class="stamp">
          <p class="kicker">{item.service}</p>
          <dl class="facts">
            <dt>{t('verifier.time')}</dt>
            <dd>{formatReportStamp(new Date(item.genTime))}</dd>
            <dt>{t('verifier.issuer')}</dt>
            <dd>{item.emetteur}</dd>
          </dl>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>{t('verifier.proof')}</h2>
  {#if signature === 'wait'}
    <p role="status">{t('verifier.signature.wait')}</p>
  {:else}
    <p
      class="mark"
      data-level={signature === 'ok' ? 'good' : signature === 'absent' ? 'untested' : 'problem'}
      role="status"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        {#if signature === 'ok'}
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        {:else if signature === 'bad'}
          <rect x="3" y="3" width="18" height="18" rx="2" />
        {:else}
          <circle cx="12" cy="12" r="10" stroke-dasharray="3.2 3.2" />
        {/if}
      </svg>
      <span>
        {signature === 'ok'
          ? t('verifier.signature.ok')
          : signature === 'bad'
            ? t('verifier.signature.bad')
            : t('verifier.signature.absent')}
      </span>
    </p>
  {/if}

  <h2>{t('verifier.check')}</h2>
  <div class="field">
    <label for="fichier-rapport">{t('verifier.file')}</label>
    <input
      id="fichier-rapport"
      type="file"
      accept=".pdf,.json,application/pdf,application/json"
      onchange={choisirFichier}
      aria-describedby="fichier-hint"
    />
    <p id="fichier-hint" class="hint">{t('verifier.hint')}</p>
    <p class="hint">{t('verifier.local')}</p>
  </div>
  <div aria-live="polite">
    {#if fichierMessage}
      <p class="form-error" role="status">{fichierMessage}</p>
    {/if}
    {#if verdict}
      <p class="mark" data-level={verdict === 'correspond' ? 'good' : 'problem'} role="status">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          {#if verdict === 'correspond'}
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          {:else}
            <rect x="3" y="3" width="18" height="18" rx="2" />
          {/if}
        </svg>
        <span>{verdict === 'correspond' ? t('verifier.match') : t('verifier.mismatch')}</span>
      </p>
    {/if}
  </div>

  {#if qr}
    <h2>{t('verifier.link')}</h2>
    <svg class="qr" role="img" aria-label={t('verifier.qr')} viewBox={`0 0 ${qr.size} ${qr.size}`}>
      <path fill="currentColor" d={qr.d} />
    </svg>
  {/if}

  <details>
    <summary>{t('verifier.expert')}</summary>
    <p>{t('verifier.openssl.lead')}</p>
    <p class="mono">{t('verifier.openssl', { digest: dossier.empreinte })}</p>
    {#each dossier.horodatages as item, index (item.jetonBase64)}
      <p class="actions">
        <button type="button" class="button button-secondary" onclick={() => sauverJeton(item, index)}>
          {t('verifier.download.token', { service: item.service })}
        </button>
        <button type="button" class="button button-secondary" onclick={() => sauverChaine(item, index)}>
          {t('verifier.download.chain', { service: item.service })}
        </button>
      </p>
    {/each}
  </details>
{/if}

<style>
  .facts {
    display: grid;
    grid-template-columns: minmax(8rem, max-content) minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
    margin: 0 0 var(--space-4);
  }

  .facts dt {
    font-weight: 600;
  }

  .facts dd {
    margin: 0;
  }

  .mono {
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
  }

  .stamps {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .stamp {
    padding: var(--space-4);
    border: var(--border) solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  .mark {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-4);
    color: var(--score-untested);
    font-weight: 600;
  }

  .mark[data-level='good'] {
    color: var(--score-good);
  }

  .mark[data-level='problem'] {
    color: var(--score-problem);
  }

  .mark svg {
    width: var(--icon-size);
    height: var(--icon-size);
    flex: none;
  }

  .qr {
    display: block;
    width: calc(var(--space-8) * 2);
    height: calc(var(--space-8) * 2);
    background: var(--paper);
    color: var(--ink);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  details {
    margin-top: var(--space-6);
  }

  summary {
    font-weight: 600;
    cursor: pointer;
  }
</style>
