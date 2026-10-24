import { describe, expect, it } from 'vitest';
import { failureCount, lintText } from '../../../../scripts/copy-lint.js';
import { fr } from './fr.js';

const KEYS = [
  'brief.role.fix',
  'brief.role.dev',
  'brief.context.url',
  'brief.context.stack',
  'brief.context.date',
  'brief.h.role',
  'brief.h.context',
  'brief.h.findings',
  'brief.h.catalog',
  'brief.h.expected',
  'brief.h.guards',
  'brief.h.terminal',
  'brief.finding.status',
  'brief.finding.proof',
  'brief.finding.impact',
  'brief.ref.id',
  'brief.ref.criterion',
  'brief.ref.pass',
  'brief.ref.source',
  'brief.expected.diff',
  'brief.expected.stack',
  'brief.expected.score',
  'brief.guard.secret',
  'brief.guard.prod',
  'brief.guard.scope',
  'brief.guard.ask',
  'brief.guard.attack',
  'brief.terminal.absent',
  'brief.terminal.origin',
  'brief.terminal.ban',
  'brief.terminal.active',
  'brief.terminal.headers',
  'brief.terminal.cert',
  'brief.terminal.dns',
  'brief.terminal.lh',
  'brief.terminal.fixSuggest',
  'brief.terminal.guess',
  'brief.terminal.fixWrite',
  'brief.count.one',
  'brief.count.many',
  'brief.allFails',
  'brief.generate',
  'brief.generate.hint',
  'brief.none',
  'brief.untested',
  'brief.copy',
  'brief.copied',
  'brief.copyFail',
  'brief.regenerate',
  'brief.download',
  'brief.collapse',
  'brief.show',
  'brief.live',
  'brief.include',
  'brief.panel',
  'brief.terminal.group',
  'brief.terminal.rien',
  'brief.terminal.rien.long',
  'brief.terminal.verif',
  'brief.terminal.verif.long',
  'brief.terminal.fix',
  'brief.terminal.fix.long',
  'brief.notProof',
] as const;

describe('fragments du brief', () => {
  it('existe, tient en 20 mots, et ne dit pas clé', () => {
    for (const key of KEYS) {
      const text = fr[key];
      expect(text, key).toBeTypeOf('string');
      const issues = lintText(text, key);
      expect(failureCount(issues), key).toBe(0);
      expect(issues.some((issue) => issue.rule === 'sentence-length'), key).toBe(
        false,
      );
      expect(text.toLocaleLowerCase('fr-FR'), key).not.toContain('clé');
    }
    expect(fr['brief.terminal.fix']).toBe('Fix');
    expect(fr['brief.copied']).toBe('Brief copié');
    expect(fr['brief.copyFail']).toBe(
      'La copie a échoué. Sélectionnez le texte.',
    );
    expect(fr['brief.notProof']).toBe('Ce fichier n’est pas une preuve.');
    expect(fr['brief.untested']).toBe('Non testé — pas de brief');
    expect(fr['brief.none']).toBe('Aucun constat à corriger');
    expect(fr['brief.generate.hint']).toBe(
      'Cochez un constat, ou prenez tous les échecs.',
    );
    expect(fr['brief.live']).toBe('Brief généré, {n} constats');
  });
});
