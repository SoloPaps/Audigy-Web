import { describe, expect, it } from 'vitest';
import { latestAuditBySite } from './site-tiles.js';

describe('latestAuditBySite', () => {
  it('garde le premier audit prêt de chaque site', () => {
    const marks = latestAuditBySite([
      {
        id: 'new',
        site_id: 's1',
        status: 'done',
        global_score: 80,
        finished_at: '2026-10-23T12:00:00.000Z',
        created_at: '2026-10-23T11:00:00.000Z',
      },
      {
        id: 'old',
        site_id: 's1',
        status: 'done',
        global_score: 40,
        finished_at: '2026-03-03T08:00:00.000Z',
        created_at: '2026-03-03T08:00:00.000Z',
      },
      {
        id: 'run',
        site_id: 's2',
        status: 'running',
        global_score: null,
        finished_at: null,
        created_at: '2026-10-24T08:00:00.000Z',
      },
    ]);
    expect(marks.get('s1')).toEqual({
      auditId: 'new',
      at: '2026-10-23T12:00:00.000Z',
      score: 80,
    });
    expect(marks.has('s2')).toBe(false);
  });
});
