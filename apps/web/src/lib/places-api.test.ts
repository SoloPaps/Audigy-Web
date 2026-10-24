import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  formatRating,
  parseCandidates,
  parsePlacesState,
} from './places-api.js';

describe('places', () => {
  it('masque la section quand le service est désactivé', () => {
    expect(parsePlacesState({ enabled: false })).toEqual({
      enabled: false,
      places: [],
    });
    expect(parsePlacesState({ enabled: true, places: [] })).toEqual({
      enabled: true,
      places: [],
    });
    expect(formatRating(4.6)).toBe('4,6');
    expect(parseCandidates({ candidates: [] })).toEqual([]);
  });

  it('n’appelle pas Places depuis le client', () => {
    const files = [
      'components/ReputationPanel.svelte',
      'components/SitesPanel.svelte',
      'components/ReportView.svelte',
      'lib/places-api.ts',
    ];
    for (const file of files) {
      const source = readFileSync(
        new URL(`../${file}`, import.meta.url),
        'utf8',
      );
      expect(source).not.toContain('googleapis');
      expect(source).not.toContain('PLACES_API_KEY');
    }
    const panel = readFileSync(
      new URL('../components/ReputationPanel.svelte', import.meta.url),
      'utf8',
    );
    expect(panel).toContain('/api/places');
  });
});
