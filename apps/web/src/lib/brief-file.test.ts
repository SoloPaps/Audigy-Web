import { describe, expect, it } from 'vitest';
import { briefFileBody, briefFilename, exportHost, parisCivilDay } from './brief-file.js';

describe('fichier du brief', () => {
  it('retire le schéma, le chemin et la casse de l’hôte', () => {
    expect(exportHost('https://Exemple.FR/a/b?q=1')).toBe('exemple.fr');
    expect(exportHost('pas une adresse')).toBe('site');
  });

  it('prend le jour civil de Paris, le même que le Markdown du rapport', () => {
    expect(parisCivilDay(new Date('2026-10-23T12:30:00Z'))).toBe('2026-10-23');
    expect(parisCivilDay(new Date('2026-10-23T22:00:00Z'))).toBe('2026-10-24');
    expect(briefFilename('https://Exemple.FR/chemin', new Date('2026-10-23T22:00:00Z'))).toBe(
      'audigy-brief-exemple.fr-2026-10-24.md',
    );
  });

  it('ajoute la ligne finale sans remplacer le brief', () => {
    const body = briefFileBody('Rôle\n- ligne\n');
    expect(body.endsWith('Ce fichier n’est pas une preuve.\n')).toBe(true);
    expect(body).toContain('Rôle\n- ligne\n');
    expect(body.trim().split('\n').at(-1)).toBe(
      'Ce fichier n’est pas une preuve.',
    );
  });
});
