import { describe, expect, it } from 'vitest';
import { type Finding, type FindingStatus, groupFindings } from './findings.js';

function row(status: FindingStatus, id: string): Finding {
  return {
    id,
    status,
    severity: 1,
    impact: 1,
    title: id,
    why: id,
    effort: 'inconnu',
    steps: ['rien'],
  };
}

describe('groupFindings', () => {
  it('À améliorer ne compte que les avertissements', () => {
    const groups = groupFindings([
      row('warn', 'a'),
      row('untested', 'b'),
      row('untested', 'c'),
      row('fail', 'd'),
    ]);
    expect(groups.next.map((item) => item.id)).toEqual(['a']);
    expect(groups.untested.map((item) => item.id)).toEqual(['b', 'c']);
    expect(groups.priority.map((item) => item.id)).toEqual(['d']);
  });
});
