import { describe, expect, it } from 'vitest';
import { gradeCopy, gradeForScore } from './grade.js';

describe('note en lettre', () => {
  it('suit les seuils', () => {
    expect(gradeForScore(95)).toBe('A');
    expect(gradeForScore(86)).toBe('B');
    expect(gradeForScore(70)).toBe('C');
    expect(gradeForScore(50)).toBe('D');
    expect(gradeForScore(40)).toBe('E');
    expect(gradeForScore(10)).toBe('F');
  });

  it('reste vide sans note', () => {
    expect(gradeForScore(null)).toBeNull();
    expect(gradeCopy(null)).toBeNull();
  });

  it('écrit la lettre, le libellé et le /100', () => {
    const copy = gradeCopy(86);
    expect(copy?.letter).toBe('Note B');
    expect(copy?.label).toMatch(/\(86\/100\)$/);
  });
});
