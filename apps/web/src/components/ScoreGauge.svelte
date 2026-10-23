<script lang="ts">
import { t } from '../i18n/index.js';
import { GAUGE, gaugeArc, gaugeLabel, levelForScore } from '../lib/score.js';
import StatusMark from './StatusMark.svelte';

interface Props {
  domain: string;
  score: number | null;
  size?: 'hero' | 'compact';
}

let { domain, score, size = 'compact' }: Props = $props();
const level = $derived(levelForScore(score));
const label = $derived(gaugeLabel(domain, score));
const arc = gaugeArc(GAUGE.cx, GAUGE.cy, GAUGE.r);
const scoreAttr = $derived(score === null ? 'none' : String(score));
</script>

<div
  class="gauge"
  data-size={size}
  data-score={scoreAttr}
  data-level={level}
  role="img"
  aria-label={label}
  style={`--gx: ${GAUGE.cx}; --gy: ${GAUGE.cy}; --gw: ${GAUGE.width}; --gh: ${GAUGE.height}`}
>
  <div class="gauge-figure">
    <svg
      aria-hidden="true"
      viewBox={GAUGE.viewBox}
      data-cx={GAUGE.cx}
      data-cy={GAUGE.cy}
      data-r={GAUGE.r}
    >
      <path class="gauge-track" d={arc} />
      <path class="gauge-fill" d={arc} pathLength="100" style={`--score: ${score ?? 0}`} />
    </svg>
    <p class="gauge-hole" aria-hidden="true">
      <span class="score-num">{score === null ? t('score.empty') : score}</span>
      {#if score !== null}
        <span class="score-denom">{t('gauge.denom')}</span>
      {/if}
    </p>
  </div>
  <div class="gauge-status" aria-hidden="true">
    <StatusMark {level} />
  </div>
</div>

<style>
  .gauge {
    container-type: inline-size;
    width: var(--gauge-size);
    max-width: 100%;
  }

  .gauge[data-size='hero'] {
    width: var(--gauge-hero);
  }

  .gauge-figure {
    position: relative;
  }

  svg {
    position: relative;
    z-index: 0;
    display: block;
    width: 100%;
    height: auto;
  }

  .gauge-track,
  .gauge-fill {
    fill: none;
    stroke-linecap: round;
    stroke-width: var(--gauge-stroke);
  }

  .gauge-track {
    stroke: var(--line);
  }

  .gauge-fill {
    stroke: var(--score-untested);
    stroke-dasharray: var(--score) 100;
  }

  @media (prefers-reduced-motion: no-preference) {
    .gauge-fill {
      animation: gauge-rise var(--duration-gauge) linear;
    }
  }

  @keyframes gauge-rise {
    from {
      stroke-dasharray: 0 100;
    }
  }

  .gauge[data-level='good'] .gauge-fill {
    stroke: var(--score-good);
  }

  .gauge[data-level='improve'] .gauge-fill {
    stroke: var(--score-improve);
  }

  .gauge[data-level='problem'] .gauge-fill {
    stroke: var(--score-problem);
  }

  .gauge-hole {
    position: absolute;
    z-index: 1;
    left: calc(var(--gx) / var(--gw) * 100%);
    top: calc(var(--gy) / var(--gh) * 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: max-content;
    max-width: none;
    margin: 0;
    color: var(--ink);
    font-size: 20cqw;
    line-height: 1;
    text-align: center;
    transform: translate(-50%, -50%);
  }

  .score-num {
    font-size: 1em;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  .score-denom {
    margin-top: var(--space-1);
    color: var(--ink-2);
    font-size: max(var(--text-xs), 0.42em);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
    line-height: 1.2;
    white-space: nowrap;
  }

  .gauge-status {
    display: flex;
    justify-content: center;
    margin-top: var(--space-2);
  }
</style>
