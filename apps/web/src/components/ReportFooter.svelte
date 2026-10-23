<script lang="ts">
import { t } from '../i18n/index.js';
import { formatReportStamp } from '../lib/format-report-stamp.js';

interface Props {
  url: string;
  at: Date;
  methodVersion: string;
  fingerprint: string;
  verifyHref: string;
}

let { url, at, methodVersion, fingerprint, verifyHref }: Props = $props();
const stamp = $derived(formatReportStamp(at));
</script>

<footer class="report-footer">
  <p>{url}</p>
  <p>
    <time datetime={at.toISOString()}>{stamp}</time>
  </p>
  <p>{t('footer.method', { version: methodVersion })}</p>
  <p class="fingerprint">{t('footer.hash', { hash: fingerprint })}</p>
  <p>
    <a class="button button-secondary" href={verifyHref}>{t('footer.verify')}</a>
  </p>
</footer>

<style>
  .report-footer {
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: var(--border) solid var(--line);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
  }

  p {
    max-width: none;
    overflow-wrap: anywhere;
  }
</style>
