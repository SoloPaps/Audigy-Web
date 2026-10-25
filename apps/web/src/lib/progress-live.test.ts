import { describe, expect, it } from 'vitest';
import { progressLive, runnerGap } from './progress-live.js';

describe('progressLive', () => {
  it('annonce l’analyse, puis le domaine, puis le rapport', () => {
    expect(progressLive('queued', [])).toBe('Analyse en cours.');
    expect(progressLive('running', [])).toBe('Analyse en cours.');
    expect(progressLive('running', ['Visibilité sur Google'])).toBe(
      'Visibilité sur Google',
    );
    expect(progressLive('done', ['Visibilité sur Google'])).toBe(
      'Rapport prêt.',
    );
    expect(progressLive('failed', [])).toContain('abouti');
  });

  it('dit que le navigateur d’audit n’a pas tourné', () => {
    expect(runnerGap([{ reason: 'reason.runner_absent' }])).toBe(
      'Nous n’avons pas pu tester : le navigateur d’audit n’a pas tourné.',
    );
    expect(runnerGap([{ reason: null }])).toBeNull();
  });
});
