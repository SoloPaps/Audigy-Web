<script lang="ts">
import { t } from '../i18n/index.js';
import { GAUGE, gaugeArc, gaugeLabel, levelForScore } from '../lib/score.js';
import StatusMark from './StatusMark.svelte';

interface Props {
  domain: string;
  score: number | null;
}

let { domain, score }: Props = $props();
const level = $derived(levelForScore(score));
const label = $derived(gaugeLabel(domain, score));
const arc = gaugeArc(GAUGE.cx, GAUGE.cy, GAUGE.r);
</script>

<div class="gauge" data-level={level} role="img" aria-label={label}>
  <svg aria-hidden="true" viewBox={GAUGE.viewBox}>
    <path class="gauge-track" d={arc} />
    <path class="gauge-fill" d={arc} pathLength="100" style={`--score: ${score ?? 0}`} />
  </svg>
  <p class="gauge-readout" aria-hidden="true">
    <span class="score-line">
      <span class="score-num">{score === null ? t('score.empty') : score}</span>
      {#if score !== null}
        <span class="score-denom">{t('gauge.denom')}</span>
      {/if}
    </span>
    <StatusMark {level} />
  </p>
</div>

<style>
  .gauge {
    position: relative;
    width: min(100%, var(--gauge-size));
  }

  svg {
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

  .gauge-readout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    margin: 0;
  }

  .score-line {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }

  .score-num {
    color: var(--ink);
    font-size: var(--text-score);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    line-height: var(--leading-title);
  }

  .score-denom {
    color: var(--ink-2);
    font-size: var(--text-lg);
    font-variant-numeric: tabular-nums;
  }
</style>
