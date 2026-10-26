import { describe, expect, it } from 'vitest';
import { collectRgesn, rgesnSummary } from './rgesn-form.js';

describe('collectRgesn', () => {
  it('ignore le silence et ne le compte pas comme un non', () => {
    const saved = collectRgesn({ '1.1': 'oui', '4.8': '', '5.1': 'na' });
    expect(saved).toEqual([
      { id: '1.1', answer: 'oui' },
      { id: '5.1', answer: 'na' },
    ]);
    expect(saved.some((row) => row.answer === 'non')).toBe(false);
    expect(rgesnSummary({ '1.1': 'oui' })).toEqual({
      answered: 1,
      total: 78,
    });
    expect(rgesnSummary({})).toEqual({ answered: 0, total: 78 });
  });
});
