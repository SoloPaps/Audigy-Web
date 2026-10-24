import { describe, expect, it } from 'vitest';
import {
  badgeHasTracker,
  exampleRaw,
  exampleView,
  scoreBadgeSvg,
  shareIsOpen,
  toPublicScore,
} from './public-score.js';

const TRAP = 'fuite-hsts-mesure-secrete';

describe('score public', () => {
  it('masque le détail sécurité par défaut', () => {
    const view = exampleView();
    const dumped = JSON.stringify(view);
    expect(view.securityDetails).toEqual([]);
    expect(dumped).not.toContain(TRAP);
    expect(dumped).not.toContain('securite.hsts');
    expect(dumped).not.toContain('measured');
    expect(view.globalScore).toBe(72);
    expect(view.domains.map((row) => row.domain)).toEqual([
      'performance',
      'securite',
    ]);
    expect(view.methodVersion).toBe('2026.1');
    expect(view.auditId).toBe('00000000-0000-4000-8000-000000000019');
  });

  it('montre le détail seulement si le propriétaire l’a demandé', () => {
    const view = toPublicScore(exampleRaw(), { exposeSecurity: true });
    expect(view.securityDetails).toEqual([
      {
        checkId: 'securite.hsts',
        status: 'fail',
        messageKey: 'finding.securite.hsts',
      },
    ]);
    expect(JSON.stringify(view)).not.toContain(TRAP);
    expect(JSON.stringify(view)).not.toContain('measured');
  });

  it('révoque le lien dès que la date est posée', () => {
    const report = { visibility: 'link', revokedAt: null as string | null };
    expect(shareIsOpen(report)).toBe(true);
    report.revokedAt = new Date().toISOString();
    expect(shareIsOpen(report)).toBe(false);
    expect(shareIsOpen(null)).toBe(false);
    expect(shareIsOpen({ visibility: 'public', revokedAt: null })).toBe(false);
  });

  it('fabrique un badge sans traceur', () => {
    const svg = scoreBadgeSvg('Exemple <script>', 72);
    expect(badgeHasTracker(svg)).toBe(false);
    expect(svg).not.toContain(TRAP);
    expect(svg).not.toContain('<script');
    expect(svg).toContain('&lt;script');
    expect(svg).toContain('72');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/);
  });
});
