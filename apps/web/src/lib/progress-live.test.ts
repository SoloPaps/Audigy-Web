import { describe, expect, it } from 'vitest';
import { progressLive } from './progress-live.js';

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
});
