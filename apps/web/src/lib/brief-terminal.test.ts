import { describe, expect, it } from 'vitest';
import type { BriefFinding } from './brief.js';
import {
  briefViolations,
  renderTerminal,
  terminalKind,
} from './brief-terminal.js';

function row(
  checkId: string,
  terminal: BriefFinding['terminal'],
  title = 'Constat',
): BriefFinding {
  return {
    id: checkId,
    checkId,
    title,
    statusLabel: 'Problème',
    proof: 'Preuve visible.',
    impact: null,
    terminal,
  };
}

describe('terminal', () => {
  it('classe les lectures déjà prévues, et refuse le sondage actif', () => {
    expect(terminalKind('securite.hsts')).toBe('headers');
    expect(terminalKind('securite.certificate')).toBe('cert');
    expect(terminalKind('securite.tls')).toBe('cert');
    expect(terminalKind('dns_email.spf')).toBe('dns');
    expect(terminalKind('performance.lcp')).toBe('lighthouse');
    expect(terminalKind('seo.lighthouse')).toBe('lighthouse');
    expect(terminalKind('accessibilite.lighthouse')).toBe('lighthouse');
    expect(terminalKind('ecologie.rgesn_cache')).toBe('lighthouse');
    expect(terminalKind('securite.fichiers')).toBe('none');
    expect(terminalKind('securite.listing')).toBe('none');
    expect(terminalKind('securite.cve_scripts')).toBe('none');
    expect(terminalKind('vie_privee.traceurs')).toBe('none');
  });

  it('omet la partie quand tout est Rien', () => {
    expect(renderTerminal([row('securite.hsts', 'rien')])).toBe('');
  });

  it('groupe Vérif et Fix, sans écriture en Vérif', () => {
    const text = renderTerminal([
      row('securite.hsts', 'verif', 'HSTS'),
      row('seo.title', 'rien', 'Titre'),
      row('dns_email.spf', 'fix', 'SPF'),
    ]);
    expect(text.startsWith('Terminal\n')).toBe(true);
    expect(text).toContain('HSTS — Vérif');
    expect(text).toContain('Lisez les en-têtes de la réponse.');
    expect(text).toContain('N’écrivez rien.');
    expect(text).not.toContain('Titre —');
    expect(text).toContain('SPF — Fix');
    expect(text).toContain('Proposez un fichier, une configuration');
    expect(text).toContain('S’il faut deviner la technique, demandez.');
    expect(text).toContain('Si l’outil n’est pas là, passez.');
    expect(text).toContain('Ces commandes ne partent pas d’Audigy.');
    expect(text).toContain('Ne lancez pas de test actif.');
    expect(briefViolations(text)).toEqual([]);
  });

  it('repère une commande destructrice ou un secret', () => {
    expect(briefViolations('rm -rf /tmp')).toEqual(
      expect.arrayContaining([expect.stringContaining('rm')]),
    );
    expect(briefViolations('git push --force')).not.toEqual([]);
    expect(briefViolations('git push -f')).not.toEqual([]);
    expect(briefViolations('NVD_API_KEY')).not.toEqual([]);
    expect(briefViolations('cookie=abc')).not.toEqual([]);
    expect(briefViolations('N’utilisez pas rm, ni un push forcé.')).toEqual([]);
  });
});
