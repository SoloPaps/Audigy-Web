import { describe, expect, it } from 'vitest';
import {
  progressEta,
  progressLive,
  progressPhase,
  runnerGap,
} from './progress-live.js';

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
      'Non testé : le navigateur d’audit n’a pas tourné.',
    );
    expect(runnerGap([{ reason: null }])).toBeNull();
  });
});

describe('progressEta', () => {
  it('donne une fourchette, puis plus rien', () => {
    expect(progressEta('queued', 0)).toBe('Comptez encore 2 à 4 minutes.');
    expect(progressEta('running', 2)).toBe('Comptez encore 1 à 3 minutes.');
    expect(progressEta('running', 5)).toBe(
      'Comptez encore moins de 2 minutes.',
    );
    expect(progressEta('done', 8)).toBeNull();
  });
});

describe('progressPhase', () => {
  it('nomme la phase sans inventer une étape', () => {
    expect(progressPhase('queued', 0, false)).toBe('Phase : file d’attente.');
    expect(progressPhase('running', 0, false)).toBe('Phase : DNS.');
    expect(progressPhase('running', 2, false)).toBe('Phase : pages.');
    expect(progressPhase('running', 5, false)).toBe('Phase : vie privée.');
    expect(progressPhase('running', 6, true)).toBe(
      'Phase : dernières mesures.',
    );
    expect(progressPhase('done', 8, true)).toBeNull();
  });
});
