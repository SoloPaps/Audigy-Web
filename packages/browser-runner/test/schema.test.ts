import { describe, expect, it } from 'vitest';
import {
  BROWSER_SHARED_KEY,
  BrowserAuditResultSchema,
  parseBrowserAuditResult,
} from '../src/schema.js';
import { sampleResult } from './sample.js';

describe('schéma de sortie du runner', () => {
  it('accepte une sortie complète, aller-retour JSON compris', () => {
    const copy: unknown = JSON.parse(JSON.stringify(sampleResult()));
    expect(parseBrowserAuditResult(copy)).toEqual(sampleResult());
    expect(BROWSER_SHARED_KEY).toBe('browser');
  });

  it('refuse la valeur d’une trace (jamais conservée)', () => {
    const result = sampleResult();
    const cookies = [{ ...result.preConsent.cookies[0], value: 'GA1.1.42' }];
    const parsed = BrowserAuditResultSchema.safeParse({
      ...result,
      preConsent: { ...result.preConsent, cookies },
    });
    expect(parsed.success).toBe(false);
  });

  it('refuse un mode actif, une autre version ou un champ inconnu', () => {
    expect(
      BrowserAuditResultSchema.safeParse({ ...sampleResult(), mode: 'active' })
        .success,
    ).toBe(false);
    expect(
      BrowserAuditResultSchema.safeParse({ ...sampleResult(), version: 2 })
        .success,
    ).toBe(false);
    expect(
      BrowserAuditResultSchema.safeParse({ ...sampleResult(), extra: true })
        .success,
    ).toBe(false);
  });

  it('refuse un nom de capture qui sortirait du dossier', () => {
    const result = sampleResult();
    const desktop = result.loads.desktop;
    const screenshot = desktop.screenshot && {
      ...desktop.screenshot,
      file: '../capture.webp',
    };
    expect(
      BrowserAuditResultSchema.safeParse({
        ...result,
        loads: { ...result.loads, desktop: { ...desktop, screenshot } },
      }).success,
    ).toBe(false);
  });

  it('accepte une sortie sans téléphone ni axe (étapes non réalisées)', () => {
    const result = sampleResult();
    const parsed = BrowserAuditResultSchema.safeParse({
      ...result,
      loads: { ...result.loads, mobile: null },
      axe: null,
      rgaa: null,
      errors: [{ step: 'axe', viewport: 'desktop', message: 'délai dépassé' }],
    });
    expect(parsed.success).toBe(true);
  });
});
