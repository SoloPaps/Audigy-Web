import { describe, expect, it } from 'vitest';
import {
  barState,
  failsOf,
  generatedLive,
  selectionLabel,
} from './brief-bar.js';

describe('barre du brief', () => {
  it('compte et active selon les cases', () => {
    expect(selectionLabel(0)).toBe('0 sélectionnés');
    expect(selectionLabel(1)).toBe('1 sélectionné');
    expect(selectionLabel(2)).toBe('2 sélectionnés');
    expect(generatedLive(3)).toBe('Brief généré, 3 constats');
    expect(
      barState({ failCount: 2, warnCount: 1, passCount: 1, selectedCount: 0 }),
    ).toEqual({
      visible: true,
      allClear: false,
      generateEnabled: false,
      failsEnabled: true,
      hint: true,
    });
    expect(
      barState({ failCount: 2, warnCount: 1, passCount: 0, selectedCount: 1 }),
    ).toMatchObject({ generateEnabled: true, hint: false, failsEnabled: true });
  });

  it('réserve le message tous réussis, et coupe la voie rapide sans problème', () => {
    expect(
      barState({ failCount: 0, warnCount: 0, passCount: 2, selectedCount: 0 }),
    ).toEqual({
      visible: false,
      allClear: true,
      generateEnabled: false,
      failsEnabled: false,
      hint: false,
    });
    expect(
      barState({ failCount: 0, warnCount: 0, passCount: 0, selectedCount: 0 }),
    ).toMatchObject({ visible: false, allClear: false });
    expect(
      barState({ failCount: 0, warnCount: 2, passCount: 0, selectedCount: 0 }),
    ).toMatchObject({ visible: true, failsEnabled: false, allClear: false });
  });

  it('la voie rapide ne prend que les problèmes, dans l’ordre reçu', () => {
    expect(
      failsOf([
        { id: 'a', catalogStatus: 'warn' },
        { id: 'b', catalogStatus: 'fail' },
        { id: 'c', catalogStatus: 'na' },
        { id: 'd', catalogStatus: 'fail' },
      ]),
    ).toEqual(['b', 'd']);
  });
});
