import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatNumber } from './format.js';

describe('formatNumber', () => {
  it('groupe les milliers avec une espace fine insécable', () => {
    expect(formatNumber(1234)).toBe('1\u202f234');
    expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
  });

  it('utilise la virgule décimale', () => {
    expect(formatNumber(1234.5)).toBe('1\u202f234,5');
  });
});

describe('formatDuration', () => {
  it('affiche les secondes au format français', () => {
    expect(formatDuration(3.5)).toBe('3,5 s');
    expect(formatDuration(3)).toBe('3 s');
  });
});

describe('formatDate', () => {
  it('formate le jour civil en Europe/Paris', () => {
    expect(formatDate(new Date('2026-10-22T22:30:00Z'))).toBe('23 oct. 2026');
    expect(formatDate(new Date('2026-10-23T12:00:00Z'))).toBe('23 oct. 2026');
    expect(formatDate(new Date('2026-10-23T22:00:00Z'))).toBe('24 oct. 2026');
  });
});
